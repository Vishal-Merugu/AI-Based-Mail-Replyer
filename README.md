# AI-Based Mail Replyer

A small Gmail automation prototype that classifies incoming email and sends a generated reply. The repository contains an Express API, a separate BullMQ worker, a MongoDB token store, and a simple React client.

## How it works

1. A user connects a Gmail account through Google OAuth.
2. The backend stores the account tokens in MongoDB and registers a Gmail watch on an inbox topic.
3. Google Pub/Sub push notifications are posted to the API’s /getMessage endpoint and added to a BullMQ queue.
4. A separate worker reads the Gmail history, labels incoming messages, asks Groq to classify and draft a response, then sends that response through Gmail.

**Replies are sent automatically by the worker.** Use a test Gmail account first and review the OAuth scopes and generated replies before connecting an account you rely on.

## Components

- backend/src/server.ts — Express API and MongoDB connection
- backend/src/controllers/emailController.ts — OAuth callback and Pub/Sub notification route
- backend/src/consumers/ — queue worker and Gmail history/message operations
- backend/src/services/groqService.ts — classification and reply generation
- client/ — basic Create React App interface

## Requirements

- Node.js and npm
- MongoDB
- Redis available at 127.0.0.1:6379 (the queue connection is configured in code)
- Google Cloud project with Gmail API, OAuth credentials, and a Pub/Sub topic
- Groq API key

## Configure and run the backend

The repository does not include a backend environment template. Create backend/.env with these values:

~~~dotenv
PORT=5000
MONGO_URL=mongodb://127.0.0.1:27017/mail_replyer
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/redirect
GC_TOPIC_NAME=projects/your-project/topics/your-topic
GROQ_API_KEY=your-groq-api-key
~~~

Use the exact redirect URL registered with your Google OAuth client. Install and compile the backend:

~~~bash
cd backend
npm install
npm run build
~~~

Run the API and worker in separate terminals from the backend directory:

~~~bash
node dist/server.js
~~~

~~~bash
node dist/consumers/index.js
~~~

The API listens on PORT. Configure the Pub/Sub push subscription to send notifications to the deployed API’s /getMessage route.

## Run the client

~~~bash
cd client
npm install
npm start
~~~

## Current limitations and security

- The /getMessage handler currently queues request bodies without verifying Pub/Sub push authentication. Add verification before exposing this route publicly.
- The Gmail watch is registered during OAuth connection; the code does not include a scheduled renewal process.
- The worker sends generated replies directly. There is no human approval step or reply preview in the current flow.
- The backend package has no configured test suite or start script; use the build and explicit API/worker commands above.
