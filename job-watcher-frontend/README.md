# Job Watcher Frontend

The frontend for the Job Watcher application, built with React, Vite, and TypeScript.

## Prerequisites
- Node.js (v18 or higher recommended)
- Existing Job Watcher FastAPI Backend

## Installation
1. Navigate to this directory.
2. Run `npm install` to install dependencies.

## Environment Variables
Copy `.env.example` to `.env.local` and populate the values:
```bash
cp .env.example .env.local
```

### Required Configuration
- `VITE_SUPABASE_URL`: The URL of your Supabase project.
- `VITE_SUPABASE_ANON_KEY`: The public/anon key for Supabase Auth.
- `VITE_API_BASE_URL`: The URL of the FastAPI backend (e.g., `http://localhost:8000`).

**Note**: Do NOT include backend secrets like `DATABASE_URL` or `TELEGRAM_BOT_TOKEN` in frontend environment files.

## Local Development
Start the development server:
```bash
npm run dev
```
The application will run on `http://localhost:5173`. Make sure your backend server is also running and CORS is configured to allow this origin.

## Available Scripts
- `npm run dev` - Start local development server
- `npm run build` - Build the application for production
- `npm run lint` - Run ESLint to check for code issues
- `npx tsc --noEmit` - Run TypeScript compiler to check for type errors
