# Real Estate AI Platform Backend (MVP)

A production-ready NestJS backend for an AI-powered real estate platform. 

## Features
- Modular architecture with NestJS
- MySQL Database using TypeORM
- Redis caching & BullMQ queues
- JWT Authentication & RBAC (Admin, Agent, Buyer)
- AI Integrations (OpenAI & Gemini) for recommendations and lead scoring
- Real-time Chat with WebSockets & Redis Pub/Sub
- WhatsApp Webhook integration mock
- Cloudinary for image uploads
- Full Swagger documentation
- Dockerized setup

## Prerequisites
- Node.js (v18+)
- Docker and Docker Compose
- Cloudinary Account
- OpenAI/Gemini API Key

## Setup & Installation

1. Install Dependencies:
```bash
npm install
```

2. Environment Setup:
Copy `.env.example` to `.env` and fill in your keys.
```bash
cp .env.example .env
```

3. Run with Docker (Starts API, MySQL, and Redis):
```bash
docker-compose up -d --build
```
Or run infrastructure only:
```bash
docker-compose up -d mysql redis
```

4. Run the app locally (if not using docker for the API):
```bash
npm run start:dev
```

## Seeding the Database
The project includes a robust seeder to generate Admins, Agents, Buyers, Properties, Leads, Conversations, and Messages.

```bash
npm run seed
```

**Admin Credentials (after seeding):**
- **Email:** `admin@realestate.com`
- **Password:** `Admin@123`

## API Documentation
Swagger is available in development mode at:
`http://localhost:3000/api/v1/docs`

## Project Structure
```
src/
├── admin           # Admin moderation endpoints
├── ai              # OpenAI & Gemini integrations
├── auth            # JWT Auth
├── cache           # Redis Cache Module
├── chat            # Realtime chat & Conversations
├── cloudinary      # Image uploads
├── common          # Decorators, Filters, Interceptors, Utils
├── config          # Environment configuration
├── dashboard       # Stats & Analytics
├── database        # TypeORM config & Seeders
├── events          # Event Emitter listeners
├── favorites       # User favorites
├── leads           # Leads & Qualification
├── notifications   # System notifications
├── properties      # Properties listing
├── queues          # BullMQ queue producers & processors
├── users           # User management
└── websocket       # Socket.io Gateway & Redis pub/sub
```

## Testing
Run unit tests:
```bash
npm run test
```

Run e2e tests:
```bash
npm run test:e2e
```
