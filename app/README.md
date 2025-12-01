App README

Run locally
- Install deps: `pip install fastapi uvicorn[standard] jinja2 python-multipart passlib[bcrypt] itsdangerous pydantic-settings`
- Start dev server: `uvicorn app.main:app --reload`

Config
- `.env` in project root controls secrets and environment:
  - `SECRET_KEY` — session signing
  - `ENV` — `dev` or `prod` (enables Secure cookies)
  - `BASE_URL` — public base URL

Data files
- JSON storage in `data/`:
  - `users.json`, `plans.json`, `subscriptions.json`, `consultations.json`

Adding plans
- Edit `data/plans.json` and restart the server (or refresh page) to see changes.

