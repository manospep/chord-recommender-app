# Merging this frontend into `chord-recommender-app/client/`

Goal: one repo, `chord-recommender-app`, with this TanStack Start frontend in
`client/` and the FastAPI backend in `server/`. Vercel deploys `client/`,
Railway keeps deploying `server/`.

## Target layout

```text
chord-recommender-app/
├── client/          # this project (replaces the old CRA client)
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
├── server/          # FastAPI + HuggingFace + Supabase (unchanged)
│   ├── main.py
│   └── requirements.txt
├── railway.toml     # root dir = server/
└── README.md
```

## 1. Branch and park the old client

```bash
git clone https://github.com/manospep/chord-recommender-app.git
cd chord-recommender-app
git checkout -b feat/lovable-frontend
git mv client client-legacy   # keep for reference until the new one is verified
```

## 2. Get this frontend's code

Clone the Lovable-synced repo (created when you clicked Connect in Lovable),
or use Code Editor → Download codebase.

```bash
git clone <lovable-repo-url> /tmp/lovable-frontend
```

## 3. Copy it into `client/`

```bash
mkdir client
rsync -a --exclude .git --exclude node_modules /tmp/lovable-frontend/ client/
```

## 4. Verify it builds standalone

```bash
cd client && bun install && bun run build
```

Nothing in `client/` should reference paths outside its own folder.

## 5. Wire up environment variables

`client/.env.example` documents everything. Locally:

```bash
cp client/.env.example client/.env
# CHORD_API_URL=http://localhost:8000
```

In Vercel (Project → Settings → Environment Variables):

| Variable                 | Scope           | Value                                 |
| ------------------------ | --------------- | ------------------------------------- |
| `CHORD_API_URL`          | server-only     | `https://<your-app>.up.railway.app`   |
| `VITE_SUPABASE_URL`      | client-visible  | your Supabase project URL             |
| `VITE_SUPABASE_ANON_KEY` | client-visible  | your Supabase anon/publishable key    |

`CHORD_API_URL` is read inside server functions, so it must **not** carry a
`VITE_` prefix. If it is unset the app silently falls back to the built-in
sample catalog — a useful signal that the variable is missing.

## 6. Configure Vercel

- Root Directory: `client`
- Framework preset: Vite
- Build command: `bun run build` (or `npm run build`)
- Do **not** set a static-export preset; TanStack Start needs the Node/edge
  runtime for its server functions.

Deploy the branch and check the preview URL.

## 7. Confirm Railway is untouched

Railway root directory stays `server/`. Because the browser talks to the
FastAPI backend through TanStack server functions (server-to-server), you do
not need to add the Vercel domain to FastAPI CORS unless you later call the
backend directly from browser code.

## 8. Retire the legacy client and merge

Once the Vercel preview deploy is green:

```bash
git rm -r client-legacy
git add client
git commit -m "Replace CRA client with Lovable TanStack frontend"
git push -u origin feat/lovable-frontend
```

Open a PR, confirm both deploys, merge to `main`.

## 9. Ongoing workflow

Keep building the frontend in Lovable. When you want to release, sync the
Lovable repo into `client/`:

```bash
cd /tmp/lovable-frontend && git pull
cd -
rsync -a --delete --exclude .git --exclude node_modules /tmp/lovable-frontend/ client/
git commit -am "Sync frontend from Lovable"
git push
```

Lovable's two-way sync stays attached to the Lovable repo only; the merged
repo is updated by this rsync step.

## Notes

- Keep one lockfile per package folder. Don't hoist to a root workspace unless
  you also update the Vercel and Railway root directories.
- Service-role Supabase keys live only in Railway/Vercel server env, never in
  `client/.env` and never behind a `VITE_` prefix.
