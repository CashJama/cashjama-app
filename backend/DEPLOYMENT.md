# CashJama Backend Deployment Guide

## Prerequisites

1. **MongoDB Atlas Account** (Free tier available)
   - Go to https://cloud.mongodb.com
   - Create a free cluster (M0 Sandbox)
   - Create a database user
   - Whitelist all IPs (0.0.0.0/0) for cloud deployment
   - Get your connection string

2. **Render or Railway Account** (Free tier available)
   - Render: https://render.com
   - Railway: https://railway.app

---

## Option A: Deploy to Render

### Step 1: Create New Web Service
1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repo OR use "Deploy from Git URL"
3. Select the `/backend` directory as root

### Step 2: Configure Service
- **Name**: cashjama-api
- **Region**: Singapore (or closest to your users)
- **Branch**: main
- **Root Directory**: backend
- **Runtime**: Docker
- **Plan**: Free

### Step 3: Set Environment Variables
In the Render dashboard, add these environment variables:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `DB_NAME` | cashjama |
| `JWT_SECRET` | (click Generate) |
| `DEV_MODE` | true |

### Step 4: Deploy
Click "Create Web Service" and wait for deployment (~3-5 mins)

### Step 5: Get Your URL
Your backend will be available at:
```
https://cashjama-api.onrender.com
```

---

## Option B: Deploy to Railway

### Step 1: Create New Project
1. Go to Railway Dashboard → New Project
2. Select "Deploy from GitHub repo" or "Empty Project"

### Step 2: Add Service
1. Click "+ New" → "GitHub Repo" or "Docker Image"
2. Point to your backend directory

### Step 3: Set Environment Variables
In Railway, go to Variables tab and add:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `DB_NAME` | cashjama |
| `JWT_SECRET` | (generate a random string) |
| `DEV_MODE` | true |
| `PORT` | 8001 |

### Step 4: Generate Domain
1. Go to Settings → Networking
2. Click "Generate Domain"

### Step 5: Get Your URL
Your backend will be available at:
```
https://cashjama-api-production.up.railway.app
```

---

## MongoDB Atlas Setup

### Step 1: Create Cluster
1. Sign up at https://cloud.mongodb.com
2. Create a new project
3. Build a Database → M0 Free Tier
4. Choose cloud provider (AWS recommended) and region

### Step 2: Create Database User
1. Go to Database Access
2. Add New Database User
3. Use Password authentication
4. Save username and password

### Step 3: Network Access
1. Go to Network Access
2. Add IP Address → Allow Access from Anywhere (0.0.0.0/0)
   - Required for cloud deployments

### Step 4: Get Connection String
1. Go to Database → Connect
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user password

---

## Testing Your Deployment

### Health Check
```bash
curl https://YOUR-BACKEND-URL/api/health
```

Expected response:
```json
{"status":"healthy","timestamp":"...","database":"connected"}
```

### Test OTP Flow
```bash
# Send OTP
curl -X POST https://YOUR-BACKEND-URL/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9999999999"}'

# Verify OTP (use 123456 in DEV_MODE)
curl -X POST https://YOUR-BACKEND-URL/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9999999999","otp":"123456"}'
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `DB_NAME` | Yes | Database name (default: cashjama) |
| `JWT_SECRET` | Yes | Secret key for JWT tokens |
| `DEV_MODE` | Yes | 'true' for mock OTP, 'false' for real SMS |
| `MSG91_API_KEY` | No* | MSG91 API key (*required when DEV_MODE=false) |
| `MSG91_TEMPLATE_ID` | No* | MSG91 template ID |
| `MSG91_SENDER_ID` | No | SMS sender ID (default: CASHJM) |

---

## Updating the Mobile App

Once deployed, update the frontend API URL:

**File**: `/frontend/src/services/api.ts`

```typescript
const BACKEND_URL = 'https://YOUR-BACKEND-URL';
```

Replace `YOUR-BACKEND-URL` with your Render or Railway URL.
