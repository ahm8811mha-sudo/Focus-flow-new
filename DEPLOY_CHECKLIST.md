# Lateen Notes Deployment Checklist

## Required before deployment

1. Create a production MySQL database.
2. Set `DATABASE_URL` in the hosting environment.
3. Set `SESSION_SECRET` to a long random value.
4. Set OAuth variables if login is required:
   - `VITE_OAUTH_PORTAL_URL`
   - `VITE_APP_ID`
   - `OAUTH_CLIENT_ID`
   - `OAUTH_CLIENT_SECRET`
   - `OAUTH_CALLBACK_URL`
5. Run migrations using:

```bash
pnpm db:push
```

## Recommended hosting

Use Render or Railway for the full app because this project contains an Express API and database-backed sessions. Vercel is included, but it is better only if you accept serverless limits.

## Local production test

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm build
pnpm start
```

Open:

```text
http://localhost:3000/api/health
http://localhost:3000
```
