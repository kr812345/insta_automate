# 📚 API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## 🔐 Authentication Endpoints

### Register

```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe" // optional
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Login

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Get Profile

```http
GET /auth/profile
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe"
}
```

### Get Instagram OAuth URL

```http
GET /auth/instagram/oauth-url
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "url": "https://www.facebook.com/v18.0/dialog/oauth?..."
}
```

---

## 👤 Social Accounts Endpoints

### Get User Accounts

```http
GET /accounts
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "platform": "instagram",
    "platformUserId": "123456789",
    "platformUsername": "username",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Connect Instagram Account

```http
POST /accounts/instagram/connect
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "code": "oauth_code_from_instagram"
}
```

**Response:**
```json
{
  "id": "uuid",
  "platform": "instagram",
  "platformUserId": "123456789",
  "platformUsername": "username",
  "isActive": true
}
```

### Get Account by ID

```http
GET /accounts/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

### Validate Account

```http
POST /accounts/:id/validate
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true
}
```

### Disconnect Account

```http
DELETE /accounts/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

---

## 📝 Posts Endpoints

### Get User Posts

```http
GET /posts?status=PENDING
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): `PENDING` | `PUBLISHED` | `FAILED` | `CANCELLED`

**Response:**
```json
[
  {
    "id": "uuid",
    "postType": "IMAGE",
    "caption": "My post caption",
    "scheduledAt": "2024-01-01T12:00:00.000Z",
    "status": "PENDING",
    "platformPostId": null,
    "mediaAssets": [
      {
        "id": "uuid",
        "fileUrl": "http://localhost:3000/uploads/image.jpg"
      }
    ],
    "socialAccount": {
      "platformUsername": "username"
    }
  }
]
```

### Get Post by ID

```http
GET /posts/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

### Create Scheduled Post

```http
POST /posts
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "socialAccountId": "uuid",
  "postType": "IMAGE", // IMAGE | CAROUSEL | REEL
  "caption": "My post caption #hashtag",
  "scheduledAt": "2024-01-01T12:00:00.000Z", // ISO 8601 format
  "mediaAssetIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "id": "uuid",
  "postType": "IMAGE",
  "caption": "My post caption #hashtag",
  "scheduledAt": "2024-01-01T12:00:00.000Z",
  "status": "PENDING",
  "mediaAssets": [...],
  "socialAccount": {...}
}
```

### Update Post

```http
PUT /posts/:id
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "caption": "Updated caption",
  "scheduledAt": "2024-01-02T12:00:00.000Z" // optional
}
```

### Delete Post

```http
DELETE /posts/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Note:** Cannot delete published posts.

### Retry Failed Post

```http
POST /posts/:id/retry
```

**Headers:**
```
Authorization: Bearer <token>
```

---

## 🎬 Media Endpoints

### Upload Media

```http
POST /media/upload
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
file: <binary file>
```

**Response:**
```json
{
  "id": "uuid",
  "fileUrl": "http://localhost:3000/uploads/image.jpg",
  "fileType": "image/jpeg",
  "fileSize": 1024000
}
```

### Delete Media

```http
DELETE /media/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

---

## ❌ Error Responses

All endpoints may return error responses in the following format:

```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

**Common Status Codes:**
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found
- `500` - Internal Server Error

---

## 📊 Rate Limiting

- Rate limit: 100 requests per minute per IP
- Headers included in response:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 99
  X-RateLimit-Reset: 1640995200
  ```

