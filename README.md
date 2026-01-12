# 📱 Instagram Post & Reel Automation Platform

A production-ready, scalable Instagram scheduling platform built with NestJS and Next.js.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Instagram Business Account with Graph API access

### Backend Setup

```bash
cd server
npm install
cp .env.example .env
# Configure .env with your database, Redis, and Instagram credentials
npm run migration:run
npm run start:dev
```

### Frontend Setup

```bash
cd client
npm install
cp .env.example .env.local
# Configure .env.local with API URL
npm run dev
```

## 📁 Project Structure

```
social_auto/
├── server/                 # NestJS Backend
│   ├── src/
│   │   ├── auth/          # Authentication module
│   │   ├── users/         # User management
│   │   ├── posts/         # Post scheduling
│   │   ├── media/         # Media handling
│   │   ├── platforms/     # Platform adapters
│   │   │   ├── base/      # PlatformAdapter interface
│   │   │   └── instagram/ # Instagram implementation
│   │   ├── scheduler/     # BullMQ scheduler
│   │   └── workers/       # Background workers
│   └── prisma/            # Database schema & migrations
├── client/                # Next.js Frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   └── lib/               # Utilities & API clients
└── docs/                  # Documentation
```

## 🔑 Environment Variables

See `.env.example` files in each directory for required variables.

## 📚 Documentation

- [Quick Start Guide](./QUICK_START.md) - Get up and running in 5 minutes
- [Architecture Overview](./ARCHITECTURE.md) - System design and architecture
- [API Documentation](./docs/API.md) - Complete API reference
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment instructions

## 🧪 Testing

```bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test
```

## 📝 License

MIT

# insta_automate
