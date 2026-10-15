# Deployment Guide: Web & FalkorDB Cloud

This document outlines deployment configurations for Ripple's presentation layer on Vercel and graph database on FalkorDB Cloud.

## 1. Web Deployment (Vercel)
The web client is built with Next.js (App Router) located in `web/`.

### Configuration
- **Framework Preset**: Next.js
- **Root Directory**: `web`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Configuration File**: [`web/vercel.json`](file:///home/gupta/Documents/code/ripple/web/vercel.json)

### Environment Variables on Vercel
Set in the Vercel Project Settings (Settings → Environment Variables):
- `NEXT_PUBLIC_API_MODE`: `mock` (for deterministic demo playback) or `live` (for backend connection).
- `NEXT_PUBLIC_API_URL`: URL of the FastAPI backend instance (e.g. `https://ripple-api.onrender.com` or `https://api.ripple.dev`).

---

## 2. FalkorDB Cloud Configuration
Ripple uses FalkorDB as its primary company brain graph datastore.

### Instance Provisioning
1. Create an instance on [FalkorDB Cloud](https://app.falkordb.cloud/).
2. Select the preferred region matching your API hosting region.
3. Retrieve host, port, username, and password credentials.

### Environment Configuration
Configure credentials exclusively via server environment variables (never committed to git):
```bash
FALKORDB_HOST="your-instance.falkordb.cloud"
FALKORDB_PORT=6379
FALKORDB_USERNAME="default"
FALKORDB_PASSWORD="your-secure-password"
RIPPLE_DEFAULT_TENANT="handbook-demo"
```
All variables are documented in [`.env.example`](file:///home/gupta/Documents/code/ripple/.env.example).
