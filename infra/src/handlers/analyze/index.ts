import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const BUCKET_NAME = process.env.BUCKET_NAME!;
const RESULTS_TABLE = process.env.RESULTS_TABLE!;
const OPENAI_API_KEY_SSM_PARAM = process.env.OPENAI_API_KEY_SSM_PARAM!;

const s3 = new S3Client({});
const ssm = new SSMClient({});
const ddbDoc = DynamoDBDocumentClient.from(new DynamoDBClient({}));

let cachedKey: string | null = null;

async function getOpenAIKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  
  const resp = await ssm.send(new GetParameterCommand({ 
    Name: OPENAI_API_KEY_SSM_PARAM, 
    WithDecryption: true 
  }));
  
  if (!resp.Parameter?.Value) {
    throw new Error('Missing OpenAI API key in SSM');
  }
  
  cachedKey = resp.Parameter.Value;
  return cachedKey;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.requestContext.authorizer?.principalId || 'unknown';
    const email = event.requestContext.authorizer?.email || '';
    
    console.log('analyze invoked', {
      userId,
      email,
      resource: event.requestContext.resourcePath,
      path: event.path,
      stage: event.requestContext.stage,
    });

    const body = event.body ? JSON.parse(event.body) : {};
    const key = body.key;
    
    if (!key) {
      return { statusCode: 400, body: 'Missing key' };
    }

    // Generate a short-lived GET URL to let OpenAI fetch the image
    const getUrl = await getSignedUrl(
      s3, 
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }), 
      { expiresIn: 60 * 5 }
    );

    const openaiKey = await getOpenAIKey();
    const prompt = buildPrompt(body.context || '');

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${openaiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: getUrl },
            ]
          }
        ],
        max_output_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI error', errText);
      return { statusCode: 502, body: 'AI analysis failed' };
    }

    const data = await response.json();
    
    // Extract text from Responses API
    const text = extractText(data);
    const carbs = parseCarbs(text);
    
    const analysisId = randomUUID();
    const item = {
      userId,
      analysisId,
      email,
      imageKey: key,
      carbs,
      resultText: text,
      createdAt: new Date().toISOString(),
    };

    await ddbDoc.send(new PutCommand({ 
      TableName: RESULTS_TABLE, 
      Item: item 
    }));

    const apiResponse: APIGatewayProxyResult = {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ analysisId, carbs, text, key }),
    };

    console.log('analyze success', { analysisId, carbs });
    return apiResponse;

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Analyze error' };
  }
};

function buildPrompt(userContext: string): string {
  return `You are a nutrition assistant for diabetics.
First determine if the image clearly depicts edible food or a meal (including packaged food labels). If it does not, do not estimate carbs.

Return exactly one JSON object with no extra commentary. Use one of the two shapes:

1) Non-food image:
{ "non_food": true, "reason": string }

2) Food image:
{ "non_food": false, "total_carbs_g": number, "items": [ { "name": string, "carbs_g": number, "notes": string | null } ] }

Rules:
- Only one JSON object, no markdown. Use null for missing notes.
- If non_food is true, omit total_carbs_g and items.
- If it is food, include items for each distinct component. Items with 0 carbs should still be listed.
- Assume standard portions unless context is provided.
${userContext ? 'Context: ' + userContext : ''}`;
}

function extractText(data: any): string {
  try {
    const out = data.output?.[0]?.content?.[0]?.text;
    if (typeof out === 'string') return out;
  } catch {}
  return JSON.stringify(data);
}

function parseCarbs(text: string): number | null {
  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const obj = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      if (typeof obj.total_carbs_g === 'number') {
        return obj.total_carbs_g;
      }
    }
  } catch {}
  
  // fallback: regex for e.g., "45 g"
  const m = text.match(/(\d+\.?\d*)\s*g/);
  return m ? Number(m[1]) : null;
}
