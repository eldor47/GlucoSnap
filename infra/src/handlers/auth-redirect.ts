import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Extract the id_token from the URL fragment
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Authentication Complete</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
        }
        .container { 
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
        }
        .success { color: #28a745; }
        .error { color: #dc3545; }
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            margin-top: 1rem;
        }
        button:hover { background: #0056b3; }
        .token-display {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 10px;
            margin: 10px 0;
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Authentication Complete</h2>
        <div id="status">Processing...</div>
        <div id="tokenInfo" style="display:none;">
            <p><strong>ID Token received:</strong></p>
            <div class="token-display" id="tokenDisplay"></div>
            <p><small>Copy this token and paste it in your app, or use the button below to return.</small></p>
        </div>
        <button onclick="returnToApp()" id="returnBtn" style="display:none;">Return to App</button>
        <button onclick="copyToken()" id="copyBtn" style="display:none;">Copy Token</button>
    </div>

    <script>
        function extractTokenFromUrl() {
            // Check URL hash for id_token (implicit flow)
            const hash = window.location.hash;
            if (hash) {
                const params = new URLSearchParams(hash.substring(1));
                return params.get('id_token');
            }
            
            // Check query parameters as fallback
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('id_token');
        }

        function returnToApp() {
            const token = extractTokenFromUrl();
            if (token) {
                // For Expo Go, we need to use a different approach
                // Try to open the app with a custom URL scheme
                try {
                    // First try to open the app
                    window.location.href = 'glucosnap://auth?token=' + encodeURIComponent(token);
                    
                    // If that doesn't work, show instructions
                    setTimeout(() => {
                        document.getElementById('status').innerHTML = 
                            '<div class="success">✓ Token ready!</div>' +
                            '<p>If the app didn\'t open automatically, copy the token above and paste it in your app.</p>';
                    }, 1000);
                } catch (e) {
                    console.log('Could not open app, showing token instead');
                }
            } else {
                alert('No token found. Please try again.');
            }
        }

        function copyToken() {
            const token = extractTokenFromUrl();
            if (token) {
                navigator.clipboard.writeText(token).then(() => {
                    const copyBtn = document.getElementById('copyBtn');
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy Token';
                    }, 2000);
                }).catch(() => {
                    alert('Could not copy to clipboard. Please copy manually.');
                });
            }
        }

        // Auto-process on load
        window.onload = function() {
            const token = extractTokenFromUrl();
            const statusDiv = document.getElementById('status');
            const returnBtn = document.getElementById('returnBtn');
            const copyBtn = document.getElementById('copyBtn');
            const tokenInfo = document.getElementById('tokenInfo');
            const tokenDisplay = document.getElementById('tokenDisplay');
            
            if (token) {
                statusDiv.innerHTML = '<div class="success">✓ Authentication successful!</div><p>Token received. You can now return to the app.</p>';
                returnBtn.style.display = 'inline-block';
                copyBtn.style.display = 'inline-block';
                tokenInfo.style.display = 'block';
                tokenDisplay.textContent = token;
                
                // Auto-redirect after 3 seconds
                setTimeout(() => {
                    returnToApp();
                }, 3000);
            } else {
                statusDiv.innerHTML = '<div class="error">✗ No authentication token found</div><p>Please try again.</p>';
                returnBtn.textContent = 'Return to App';
                returnBtn.style.display = 'inline-block';
            }
        };
    </script>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache',
    },
    body: html,
  };
};

