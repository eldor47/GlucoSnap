# GlucoSnap

A comprehensive diabetes management application that helps users track their meals, analyze nutritional content, and manage their health data.

## Features

- **Secure Authentication**: AWS Cognito-based user management with MFA support
- **Meal Logging**: Photo-based meal tracking with nutritional analysis
- **User Profiles**: Personalized user experience with customizable profiles
- **Cross-Platform**: Built with React Native and Expo for iOS and Android
- **Serverless Backend**: AWS Lambda, DynamoDB, and API Gateway
- **Real-time Analysis**: AI-powered meal analysis and nutritional insights

## Architecture

### Frontend (React Native + Expo)
- **Authentication**: Email/password with Cognito integration
- **UI Components**: Modern, accessible design with theme support
- **State Management**: React Context for session and app state
- **Navigation**: Expo Router for seamless navigation

### Backend (AWS Serverless)
- **Authentication**: AWS Cognito User Pool
- **API**: RESTful API with API Gateway
- **Database**: DynamoDB for user data and meal logs
- **Compute**: Lambda functions for business logic
- **Security**: JWT tokens and IAM roles

## Quick Start

### Prerequisites
- Node.js 18+
- AWS CLI configured
- Expo CLI: `npm install -g @expo/cli`
- AWS CDK: `npm install -g aws-cdk`

### 1. Clone the Repository
```bash
git clone <repository-url>
cd GlucoSnap
```

### 2. Install Dependencies
```bash
# Frontend
cd apps/glucosnap
npm install

# Infrastructure
cd ../../infra
npm install
```

### 3. Deploy Infrastructure
```bash
cd infra
npm run build
cdk bootstrap  # First time only
cdk deploy
```

### 4. Update App Configuration
After deployment, update `apps/glucosnap/app.json` with the new API URL from the CDK output.

### 5. Start the App
```bash
cd apps/glucosnap
npx expo start
```

## Project Structure

```
GlucoSnap/
├── apps/
│   └── glucosnap/           # React Native app
│       ├── app/             # Expo Router pages
│       ├── src/             # Source code
│       │   ├── components/  # Reusable components
│       │   ├── services/    # API services
│       │   ├── state/       # State management
│       │   └── theme/       # UI theme and styles
│       ├── app.json         # Expo configuration
│       └── package.json     # Frontend dependencies
├── infra/                   # Infrastructure as Code
│   ├── lib/                 # CDK stack definitions
│   ├── src/                 # Lambda function code
│   │   ├── handlers/        # API handlers
│   │   └── utils/           # Utility functions
│   ├── package.json         # Infrastructure dependencies
│   └── DEPLOYMENT.md        # Deployment guide
└── README.md                # This file
```

## API Endpoints

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/signin` - User login

### User Management
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile

### Meal Logs
- `GET /meals/logs` - Get user's meal logs
- `POST /meals/logs` - Create new meal log
- `PUT /meals/logs/{logId}` - Update meal log
- `DELETE /meals/logs/{logId}` - Delete meal log

## Security Features

- **Password Policy**: Strong password requirements with complexity rules
- **Multi-Factor Authentication**: Optional SMS and TOTP support
- **JWT Tokens**: Secure API authentication
- **IAM Roles**: Least privilege access to AWS resources
- **Data Encryption**: At-rest and in-transit encryption

## Development

### Frontend Development
```bash
cd apps/glucosnap
npm start          # Start Expo development server
npm run android    # Run on Android emulator
npm run ios        # Run on iOS simulator
```

### Backend Development
```bash
cd infra
npm run build      # Build TypeScript
npm run watch      # Watch for changes
cdk diff           # Preview infrastructure changes
```

### Testing
```bash
# Frontend tests
cd apps/glucosnap
npm test

# Infrastructure tests
cd infra
npm test
```

## Deployment

### Staging
```bash
cd infra
cdk deploy --profile staging
```

### Production
```bash
cd infra
cdk deploy --profile production
```

## Monitoring

- **CloudWatch Logs**: Lambda function and API Gateway logs
- **CloudWatch Metrics**: Performance and error metrics
- **X-Ray**: Distributed tracing for API calls

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the documentation
- Review CloudWatch logs
- Open an issue on GitHub
- Contact the development team

## Roadmap

- [ ] Push notifications for meal reminders
- [ ] Integration with health devices
- [ ] Advanced analytics dashboard
- [ ] Social features and sharing
- [ ] Offline support
- [ ] Multi-language support

