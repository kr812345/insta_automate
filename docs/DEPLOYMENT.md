# 🚀 Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- Instagram Business Account
- Facebook App with Instagram Graph API access

---

## 🏗️ Backend Deployment

### 1. Environment Setup

```bash
cd server
cp .env.example .env
```

Configure `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/social_auto?schema=public"

# Server
PORT=3000
NODE_ENV=production

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=1h

# Instagram Graph API
INSTAGRAM_APP_ID=your-instagram-app-id
INSTAGRAM_APP_SECRET=your-instagram-app-secret
INSTAGRAM_REDIRECT_URI=https://yourdomain.com/api/auth/instagram/callback

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Media Storage
STORAGE_TYPE=s3  # or 'local'
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# CORS
FRONTEND_URL=https://yourdomain.com
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Production) Deploy migrations
npm run migration:run
```

### 4. Build

```bash
npm run build
```

### 5. Start Production Server

```bash
npm run start:prod
```

### 6. Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start dist/main.js --name social-auto-api

# Save PM2 config
pm2 save
pm2 startup
```

---

## 🎨 Frontend Deployment

### 1. Environment Setup

```bash
cd client
cp .env.example .env.local
```

Configure `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build

```bash
npm run build
```

### 4. Start Production Server

```bash
npm run start
```

### 5. Process Manager (PM2)

```bash
pm2 start npm --name social-auto-client -- start
```

---

## 🐳 Docker Deployment

### Backend Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

### Frontend Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.js ./

RUN npm ci --only=production

EXPOSE 3001

CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: social_auto
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./server
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/social_auto
      REDIS_HOST: redis
      REDIS_PORT: 6379
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./client
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3000/api
    ports:
      - "3001:3001"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

Run with:
```bash
docker-compose up -d
```

---

## ☁️ Cloud Deployment (AWS/GCP/Azure)

### AWS Deployment

1. **EC2 Instance**
   - Ubuntu 22.04 LTS
   - Install Node.js, PostgreSQL, Redis
   - Use PM2 or systemd for process management

2. **RDS PostgreSQL**
   - Create RDS instance
   - Update `DATABASE_URL` in backend `.env`

3. **ElastiCache Redis**
   - Create Redis cluster
   - Update `REDIS_HOST` in backend `.env`

4. **S3 for Media Storage**
   - Create S3 bucket
   - Configure CORS
   - Update AWS credentials in `.env`

5. **CloudFront CDN**
   - Create distribution for frontend
   - Origin: S3 bucket or ALB

6. **Application Load Balancer**
   - Route traffic to EC2 instances
   - SSL certificate via ACM

### Environment Variables (Secrets Manager)

Store sensitive values in AWS Secrets Manager or Parameter Store:

```bash
aws secretsmanager create-secret \
  --name social-auto/database-url \
  --secret-string "postgresql://..."
```

---

## 🔒 Security Checklist

- [ ] Change default JWT secret
- [ ] Use strong database passwords
- [ ] Enable SSL/TLS for all connections
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Use environment variables for secrets
- [ ] Enable database backups
- [ ] Set up monitoring and alerts
- [ ] Regular security updates
- [ ] Use HTTPS only

---

## 📊 Monitoring

### Health Check Endpoint

```http
GET /health
```

### Logging

- Backend logs: `logs/` directory or stdout
- Use Winston or Pino for structured logging
- Ship logs to CloudWatch/DataDog

### Metrics

- Queue stats: `/api/scheduler/stats` (internal)
- Database connections: Monitor Prisma client
- API response times: Use APM tools

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd server && npm ci
          cd ../client && npm ci
      
      - name: Build
        run: |
          cd server && npm run build
          cd ../client && npm run build
      
      - name: Deploy
        run: |
          # Your deployment commands
```

---

## 🆘 Troubleshooting

### Backend won't start

- Check database connection
- Verify Redis is running
- Check environment variables
- Review logs

### Posts not publishing

- Check BullMQ worker is running
- Verify Redis connection
- Check Instagram API credentials
- Review job logs in database

### Media upload fails

- Check storage configuration
- Verify file size limits
- Check disk space (local storage)
- Verify S3 permissions (S3 storage)

---

## 📞 Support

For issues or questions, check:
- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- GitHub Issues

