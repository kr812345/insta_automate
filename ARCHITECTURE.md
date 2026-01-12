# 🏗️ System Architecture: Instagram Post & Reel Automation Platform

## 📋 Product Overview

A production-ready, scalable Instagram scheduling platform that allows users to:
- Connect Instagram accounts via OAuth
- Upload posts (images/carousels) and reels (videos)
- Schedule content with captions and hashtags
- Automatically publish at scheduled times
- Built with platform-agnostic architecture for future extensibility

---

## 🎯 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Next.js Frontend (App Router)                           │   │
│  │  - Authentication UI                                     │   │
│  │  - Post Creation & Scheduling                            │   │
│  │  - Calendar View                                         │   │
│  │  - Dashboard                                             │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTPS/REST
┌─────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  NestJS REST API                                         │   │
│  │  - Auth Endpoints (JWT)                                  │   │
│  │  - Instagram OAuth Flow                                  │   │
│  │  - Post Management                                       │   │
│  │  - Media Upload                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Auth        │  │  Platform    │  │  Scheduling  │          │
│  │  Service     │  │  Adapter     │  │  Service     │          │
│  └──────────────┘  │  Interface   │  └──────────────┘          │
│                    └──────────────┘                             │
│                           ↕                                      │
│                    ┌──────────────┐                             │
│                    │  Instagram   │                             │
│                    │  Adapter     │                             │
│                    │  (Graph API) │                             │
│                    └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      BACKGROUND WORKERS                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  BullMQ Worker                                           │   │
│  │  - Scheduled Job Processor                               │   │
│  │  - Retry Failed Jobs                                     │   │
│  │  - Status Updates                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │  Redis       │  │  S3/Storage  │          │
│  │  (Primary DB)│  │  (Queue)     │  │  (Media)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                           │
│                    Instagram Graph API                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: Scheduling → Publishing

### 1. **User Creates Scheduled Post**
```
User → Frontend → API POST /api/posts/schedule
  → PostService.validate()
  → PostService.create()
  → Database: Insert scheduled_post record
  → BullMQ: Queue job with scheduled time
  → Response: { postId, scheduledAt, status: 'pending' }
```

### 2. **Background Worker Processing**
```
BullMQ Worker (runs every minute)
  → Check jobs scheduled in next 1 minute
  → Process scheduled_post
    → Fetch post + media from DB
    → Load InstagramAdapter for account
    → Refresh access token if expired
    → Upload media to Instagram
    → Create post/reel via Graph API
    → Update status: 'published' or 'failed'
    → Log result in job_logs
```

### 3. **Retry Logic**
```
If publish fails:
  → Update status: 'failed'
  → Retry up to 3 times (exponential backoff)
  → After max retries: status 'failed', notify user
```

---

## 🔌 Platform Abstraction Design

### Core Interface: `PlatformAdapter`

```typescript
interface PlatformAdapter {
  // Account Management
  connectAccount(oauthCode: string): Promise<ConnectedAccount>;
  validateAccount(accountId: string): Promise<boolean>;
  refreshToken(accountId: string): Promise<string>;
  disconnectAccount(accountId: string): Promise<void>;

  // Publishing
  publishPost(post: ScheduledPost): Promise<PublishResult>;
  publishReel(reel: ScheduledPost): Promise<PublishResult>;
  getPostStatus(postId: string, platformPostId: string): Promise<PostStatus>;

  // Platform Info
  getPlatformName(): string;
  getSupportedPostTypes(): PostType[];
  validateMedia(media: MediaAsset): ValidationResult;
}
```

### Instagram Implementation

```typescript
class InstagramAdapter implements PlatformAdapter {
  private graphApi: InstagramGraphAPI;
  
  async publishPost(post: ScheduledPost): Promise<PublishResult> {
    // 1. Upload media to Instagram
    // 2. Create container
    // 3. Publish container
    // 4. Return platform post ID
  }
  
  async publishReel(reel: ScheduledPost): Promise<PublishResult> {
    // Instagram Reels API flow
  }
}
```

### Future Extensibility

To add YouTube/Twitter/LinkedIn:
1. Create `YouTubeAdapter implements PlatformAdapter`
2. Register in PlatformFactory
3. Add platform type to DB enum
4. **Zero changes to core scheduling logic**

---

## 🗄️ Database Schema

### Users Table
```sql
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Social Accounts Table
```sql
social_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  platform VARCHAR(50) NOT NULL, -- 'instagram', 'youtube', etc.
  platform_user_id VARCHAR(255) NOT NULL,
  platform_username VARCHAR(255),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, platform, platform_user_id)
)
```

### Scheduled Posts Table
```sql
scheduled_posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  social_account_id UUID REFERENCES social_accounts(id),
  platform VARCHAR(50) NOT NULL,
  post_type VARCHAR(20) NOT NULL, -- 'image', 'carousel', 'reel'
  caption TEXT,
  scheduled_at TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'published', 'failed', 'cancelled'
  platform_post_id VARCHAR(255), -- Instagram post ID after publishing
  retry_count INT DEFAULT 0,
  error_message TEXT,
  published_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX(scheduled_at, status),
  INDEX(user_id, status)
)
```

### Media Assets Table
```sql
media_assets (
  id UUID PRIMARY KEY,
  scheduled_post_id UUID REFERENCES scheduled_posts(id),
  file_url TEXT NOT NULL,
  file_type VARCHAR(50), -- 'image/jpeg', 'video/mp4'
  file_size BIGINT,
  width INT,
  height INT,
  position INT, -- For carousels (order)
  storage_key VARCHAR(255), -- S3 key
  created_at TIMESTAMP
)
```

### Job Logs Table
```sql
job_logs (
  id UUID PRIMARY KEY,
  scheduled_post_id UUID REFERENCES scheduled_posts(id),
  status VARCHAR(20),
  message TEXT,
  error_details JSONB,
  execution_time_ms INT,
  created_at TIMESTAMP,
  INDEX(scheduled_post_id, created_at)
)
```

---

## 🔐 Security Best Practices

1. **Token Storage**: Encrypted at rest, never log access tokens
2. **OAuth Flow**: PKCE for mobile, secure callback URLs
3. **API Authentication**: JWT with short expiration, refresh tokens
4. **Media Upload**: Signed URLs, virus scanning, size limits
5. **Rate Limiting**: Per-user, per-platform rate limits
6. **Input Validation**: All user inputs sanitized
7. **SQL Injection**: Parameterized queries only (TypeORM)
8. **CORS**: Restrictive origins in production
9. **Environment Variables**: Secrets in .env, never commit

---

## 🚀 Scalability Strategy

1. **Horizontal Scaling**: Stateless API servers, load balancer
2. **Queue Workers**: Multiple BullMQ workers, auto-scaling
3. **Database**: Read replicas, connection pooling
4. **Caching**: Redis for token caching, frequently accessed data
5. **Media Storage**: CDN for media assets (CloudFront + S3)
6. **Monitoring**: Prometheus + Grafana, error tracking (Sentry)

---

## 📈 Next Feature Roadmap (Post-Phase 1)

1. **Multi-Platform Support**
   - YouTube Shorts adapter
   - Twitter/X adapter
   - LinkedIn adapter
   - Threads adapter

2. **Analytics Dashboard**
   - Post performance metrics
   - Engagement tracking
   - Best time to post analysis

3. **Content Features**
   - AI caption generation
   - Hashtag suggestions
   - Post templates
   - Media library

4. **Team Collaboration**
   - Multi-user accounts
   - Approval workflows
   - Role-based access

5. **Advanced Scheduling**
   - Recurring posts
   - Best time optimization
   - A/B testing

---

## 🛡️ Edge Cases & Failure Handling

1. **Instagram API Down**: Retry with exponential backoff, notify user
2. **Token Expired Mid-Publish**: Auto-refresh, retry publish
3. **Media Upload Fails**: Retry up to 3 times, fallback error message
4. **Scheduled Time Passed**: Publish immediately if within 5 min grace period
5. **Duplicate Posts**: Check for duplicates before publishing
6. **Rate Limiting**: Queue job for later, respect API limits
7. **Large Media Files**: Streaming upload, progress tracking
8. **Account Disconnected**: Mark posts as failed, notify user

---

## 🧪 Testing Strategy

1. **Unit Tests**: Adapters, services, utilities
2. **Integration Tests**: API endpoints, database operations
3. **E2E Tests**: Full scheduling → publishing flow
4. **Mock Instagram API**: Use nock for testing
5. **Load Tests**: Queue processing under load

