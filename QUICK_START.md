# 🚀 Quick Start Guide

## Prerequisites

1. **Node.js 18+** and npm
2. **PostgreSQL 14+** (install and start)
3. **Redis 6+** (install and start)
4. **Instagram Business Account** with Facebook Page connected
5. **Facebook App** with Instagram Graph API access

---

## 📋 Step 1: Facebook/Instagram Setup

### 1.1 Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app → Select "Business" type
3. Add **Instagram Graph API** product
4. Configure **Instagram Basic Display** or **Instagram Graph API**

### 1.2 Get App Credentials

- **App ID**: Found in App Dashboard → Settings → Basic
- **App Secret**: Found in App Dashboard → Settings → Basic (show secret)

### 1.3 Configure OAuth Redirect URI

In Facebook App Dashboard → Products → Instagram → Basic Display:
- Add redirect URI: `http://localhost:3000/api/auth/instagram/callback`

### 1.4 Get Instagram Business Account

1. Connect your Instagram Business/Creator account to a Facebook Page
2. Go to Page Settings → Instagram
3. Confirm Instagram account is connected

---

## 📦 Step 2: Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
DATABASE_URL="postgresql://user:password@localhost:5432/social_auto?schema=public"
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=1h
INSTAGRAM_APP_ID=your-instagram-app-id
INSTAGRAM_APP_SECRET=your-instagram-app-secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/auth/instagram/callback
REDIS_HOST=localhost
REDIS_PORT=6379
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=./uploads
FRONTEND_URL=http://localhost:3001
EOF

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Create uploads directory
mkdir -p uploads

# Start Redis (if not running)
redis-server

# Start backend server
npm run start:dev
```

Backend will run on `http://localhost:3000`

---

## 🎨 Step 3: Frontend Setup

```bash
# Navigate to client directory
cd ../client

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3000/api
EOF

# Start frontend dev server
npm run dev
```

Frontend will run on `http://localhost:3001`

---

## ✅ Step 4: Test the System

### 4.1 Register Account

1. Go to `http://localhost:3001/register`
2. Create a new account
3. You'll be redirected to dashboard

### 4.2 Connect Instagram Account

1. In dashboard, go to "Connected Accounts" tab
2. Click "Connect Instagram Account"
3. Authorize app on Facebook/Instagram
4. You'll be redirected back with account connected

### 4.3 Schedule Your First Post

1. Go to "Create Post" tab
2. Select your Instagram account
3. Choose post type (Image, Carousel, or Reel)
4. Upload media files
5. Add caption and hashtags
6. Select scheduled date/time
7. Click "Schedule Post"

### 4.4 Monitor Scheduled Posts

1. Go to "Scheduled Posts" tab
2. See all your scheduled posts
3. Status will update automatically:
   - **PENDING**: Waiting to be published
   - **PUBLISHED**: Successfully published
   - **FAILED**: Publishing failed (can retry)

---

## 🐛 Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Create database if needed
createdb social_auto

# Update DATABASE_URL in .env
```

### Redis Connection Error

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Start Redis if not running
redis-server
```

### Instagram OAuth Error

- Verify `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET` in `.env`
- Check redirect URI matches in Facebook App settings
- Ensure Instagram account is Business/Creator (not Personal)
- Verify Instagram is connected to a Facebook Page

### Posts Not Publishing

1. Check backend logs for errors
2. Verify Redis and BullMQ worker are running
3. Check Instagram access token hasn't expired
4. Review job logs in database:
   ```sql
   SELECT * FROM job_logs ORDER BY created_at DESC LIMIT 10;
   ```

---

## 📚 Next Steps

- Read [Architecture Documentation](./ARCHITECTURE.md) for system design
- Check [API Documentation](./docs/API.md) for API reference
- Review [Deployment Guide](./docs/DEPLOYMENT.md) for production setup

---

## 🎯 Production Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Use production database (managed PostgreSQL)
- [ ] Use production Redis (managed service)
- [ ] Configure S3 for media storage
- [ ] Set up SSL/HTTPS
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and logging
- [ ] Enable database backups
- [ ] Set up CI/CD pipeline

---

## 💡 Tips

- **Scheduling Window**: Posts are checked every minute, so schedule at least 1 minute in the future
- **Media Limits**: 
  - Images: Max 8MB, 320-1440px recommended
  - Videos (Reels): Max 100MB, 1080x1920px (9:16) recommended
  - Carousel: 2-10 images
- **Token Refresh**: Tokens are automatically refreshed when expired
- **Retry Logic**: Failed posts are retried up to 3 times with exponential backoff

---

## 🆘 Need Help?

- Check logs: `server/logs/` or console output
- Review error messages in dashboard
- Check database: `job_logs` table for execution details
- Instagram API errors: Check [Instagram Graph API Docs](https://developers.facebook.com/docs/instagram-api/)

