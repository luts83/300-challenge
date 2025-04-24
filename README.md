# Writing Practice App

A web application for daily writing practice with AI feedback.

## Features

- Daily writing practice with timer
- AI-powered feedback and scoring
- User authentication
- Token-based submission system
- Daily topics
- Submission history

## Tech Stack

- Frontend: React, TypeScript, Tailwind CSS
- Backend: Node.js, Express
- Database: MongoDB
- Authentication: Firebase

## Setup

1. Clone the repository

```bash
git clone [repository-url]
```

2. Install dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Set up environment variables
   Create `.env` files in both server and client directories with the following variables:

Server (.env):

```
PORT=3000
MONGODB_URI=your_mongodb_uri
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
OPENAI_API_KEY=your_openai_api_key
```

Client (.env):

```
VITE_API_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

4. Start the development servers

```bash
# Start server
cd server
npm run dev

# Start client
cd ../client
npm run dev
```

## Configuration

The application can be configured through the `config.ts` file in the client directory. Available options include:

- Token limits
- Character limits
- AI feedback settings
- Topic display settings

## License

Digiocean
