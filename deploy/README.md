# deploy/

Owner: `@harsh-gupta-10` (Person B). Gated path: changes need human approval (`gate-check`).

This directory contains container specs, deployment configurations, and operational scripts for deploying Ripple's API and background agents, connecting to FalkorDB Cloud, and seeding deterministic demo data.

---

## 1. Architecture Overview

- **Presentation Layer (Web):** Deployed to Vercel (see [`web/vercel.json`](../web/vercel.json) and [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md)).
- **Backend API & Agents:** Containerized FastAPI service running on Render or Fly.io via [`deploy/api.Dockerfile`](./api.Dockerfile).
- **Primary Brain Datastore:** Managed FalkorDB instance on [FalkorDB Cloud](https://app.falkordb.cloud/).
- **Database Seeding:** [`deploy/seed.sh`](./seed.sh) loads real GitLab policy changes C1–C5, documentation graph with `LINKS_TO`, and seeded synthetic people/plans.

---

## 2. Render Deployment (Blueprint)

Use [`deploy/render.yaml`](./render.yaml) to deploy a Web Service on Render:

1. Connect the `sahil1330/ripple` repository in Render.
2. Select **New Blueprint Instance** and point to `deploy/render.yaml`.
3. Configure the environment variables in the Render Dashboard:
   - `FALKORDB_HOST`: FalkorDB Cloud endpoint (e.g. `xyz.falkordb.cloud`).
   - `FALKORDB_PORT`: `6379`.
   - `FALKORDB_USERNAME`: `default`.
   - `FALKORDB_PASSWORD`: Password from FalkorDB Cloud console.
   - `RIPPLE_DEFAULT_TENANT`: `handbook-demo`.
4. Render deploys `api.Dockerfile` exposing port `8000` with health check at `/api/health`.

---

## 3. Fly.io Deployment

Use [`deploy/fly.toml`](./fly.toml) to deploy on Fly.io:

```bash
# Launch application from repo root
fly launch --config deploy/fly.toml --no-deploy

# Set FalkorDB Cloud secrets
fly secrets set \
  FALKORDB_HOST="your-falkordb-instance.cloud.falkordb.com" \
  FALKORDB_PASSWORD="your-strong-password"

# Deploy
fly deploy --config deploy/fly.toml
```

---

## 4. Seeding FalkorDB (Cloud or Local)

The deterministic seeding pipeline seeds 3 layers into tenant `handbook-demo`:
1. `ingest.handbook_changes`: Verified GitLab changes C1–C5 with `chg:c1` in pending state.
2. `ingest.handbook_docs`: Finance documentation pages with `LINKS_TO` and `STATES`/`CITES`.
3. `ingest.synthetic`: Synthetic people (Priya, Alex, Marcus), teams, plans, and worker agents (`ap-approver`).

### Running the Seed Script

Set environment variables pointing to FalkorDB Cloud:
```bash
export FALKORDB_HOST="your-falkordb-instance.cloud.falkordb.com"
export FALKORDB_PORT=6379
export FALKORDB_USERNAME="default"
export FALKORDB_PASSWORD="your-strong-password"
export RIPPLE_DEFAULT_TENANT="handbook-demo"

# Run automated seed script
./deploy/seed.sh handbook-demo 42
```

Alternatively, invoke each module directly with Python:
```bash
python -m ingest.handbook_changes --tenant handbook-demo --pending chg:c1
python -m ingest.handbook_docs --tenant handbook-demo
python -m ingest.synthetic --tenant handbook-demo --seed 42
```

---

## 5. Live URL Verification Checklist

Once the API service is running, verify the C1 scenario end-to-end:

```bash
API_URL="https://ripple-api.onrender.com"  # Replace with deployed URL

# 1. Health check
curl -f "${API_URL}/api/health"
# Expect: {"status":"ok","falkordb":"connected"}

# 2. Verify initial pending change C1
curl -f "${API_URL}/api/change/chg:c1?tenant=handbook-demo"

# 3. Verify impact graph calculation
curl -f "${API_URL}/api/impact?tenant=handbook-demo&change_id=chg:c1"

# 4. Step through demo stepper
curl -f -X POST "${API_URL}/api/demo/step" \
  -H "Content-Type: application/json" \
  -d '{"tenant":"handbook-demo","step":1}'
```
