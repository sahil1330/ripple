# deploy/

Owner: @harsh-gupta-10 (Person B). Gated path: changes need human approval (`gate-check`).

- `api.Dockerfile`: FastAPI + agents image (used by `docker-compose.yml` and Render/Fly).
- Planned: Vercel (web), Render or Fly.io (API + agents), FalkorDB Cloud (graph). Secrets live only in provider env settings; document every variable in `/.env.example`.
