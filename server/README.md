# LFG API (Pie Guy Guide)

Express API backed by **Supabase** so all app users share the same LFG posts. Deploy this server (e.g. Render, Railway) and set **Options → LFG server URL** in the app to the deployed URL.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is enough).

2. **Create the tables** (pick one):
   - **With Cursor/Supabase**: From repo root run `npx supabase link` then `npx supabase db push` (see `supabase/README.md`).
   - **Manual**: In Supabase Dashboard → **SQL Editor**, run the contents of `server/supabase-schema.sql`.

3. **Environment variables**: Copy `.env.example` to `.env` and set:
   - `SUPABASE_URL` — from Project Settings → API → Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — from Project Settings → API → `service_role` (secret; never expose in the client)

4. **Install and run**:
   ```bash
   cd server
   npm install
   npm start
   ```
   Server listens on port **3765** (or `PORT` from env).

## Deploy (free options)

- **Render**: New Web Service → connect repo, root = `server`, build `npm install`, start `npm start`, add env vars.
- **Railway** / **Fly.io**: Deploy the `server` folder, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, and optionally `PORT`.

After deploy, set **LFG server URL** in the app (Options) to your public URL (e.g. `https://your-app.onrender.com`).

## API (unchanged for the app)

- `GET /api/posts?server=1` — list posts for game server
- `GET /api/posts/:id` — one post with `interested` list
- `GET /api/posts/:id/comments` — comments for a post
- `POST /api/posts` — create post (body: `authorName`, `text`, `slots`, `server`)
- `POST /api/posts/:id/interested` — add interest (body: `playerName`)
- `DELETE /api/posts/:id/interested` — remove interest (body: `playerNameToRemove`, `requesterName`)
- `POST /api/posts/:id/comments` — add comment (body: `authorName`, `text`)
- `GET /api/health` — health check
