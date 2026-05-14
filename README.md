# AI-Based Mail Replyer

An AI-powered automated email responder built with Node.js, Express, React, BullMQ, and the Groq LLM API.

## Architecture

This project consists of:
- **Backend (Node.js/Express)**: Handles Gmail OAuth authentication, receives email webhook notifications via Google Pub/Sub, and manages a BullMQ job queue for processing incoming emails asynchronously.
- **Queue/Worker**: Processes background tasks, fetches new email threads from Gmail, and calls the Groq API (using the `mixtral-8x7b-32768` model).
- **LLM Service (Groq)**: Analyzes incoming emails to assign a category ("Interested", "Not Interested", "More Information") and automatically generates an appropriate response which is then dispatched via the Gmail API.
- **Frontend (React)**: Basic client interface for navigation and potentially future dashboards.

## Features
- Gmail OAuth Integration (Offline access, modify and send scopes)
- Webhooks via Gmail Watch API & Google Cloud Pub/Sub
- Robust Async Task Processing using BullMQ and Redis
- Automated categorization and replies using Mixtral 8x7b on Groq

## Prerequisites
- Node.js & npm
- Redis (running locally on port 6379, required for BullMQ)
- MongoDB instance (to store user access/refresh tokens)
- Google Cloud Console Project (with Gmail API enabled, OAuth client credentials, and a Pub/Sub topic configured)
- Groq API Key

## Setup & Installation

### Backend

1. Navigate to the `backend` directory.
   ```bash
   cd backend
   npm install
   ```

2. Create a `.env` file based on `.env.example` (or set these variables):
   - `PORT`: Server port
   - `MONGO_URL`: MongoDB connection string
   - `GOOGLE_CLIENT_ID`: OAuth Client ID
   - `GOOGLE_CLIENT_SECRET`: OAuth Client Secret
   - `GOOGLE_REDIRECT_URI`: OAuth Redirect URI
   - `GC_TOPIC_NAME`: Google Cloud Pub/Sub Topic name for Gmail Watch
   - `GROQ_API_KEY`: Groq API key

3. Build and run:
   ```bash
   npm run build
   npm start
   ```

### Frontend

1. Navigate to the `client` directory.
   ```bash
   cd client
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

## Project Structure (Backend)
- `src/controllers/` - Route logic (e.g., Email authorization and redirect)
- `src/routes/` - Express routing definitions
- `src/services/` - External API integrations (Groq Chat completion)
- `src/consumers/` - BullMQ Workers and Gmail API utilities
- `src/models/` - Mongoose schemas (MailMeta)
- `src/utils/` - Helpers (OAuth methods, env validation, loggers)
