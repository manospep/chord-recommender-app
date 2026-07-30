## Goal

Single repo `chord-recommender-app` with the Lovable (TanStack Start) frontend in `client/`, FastAPI backend in `server/`. Vercel deploys `client/`, Railway keeps deploying `server/`.

## Target layout

```text
chord-recommender-app/
├── client/        # Lovable TanStack Start frontend (replaces old CRA client)
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
├── server/        # FastAPI + HuggingFace + Supabase (unchanged)
│   ├── main.py
│   └── requirements.txt
├── railway.toml   # root dir = server/
├── vercel.json    # root dir = client/
└── README.md
```

## Steps

**1. Branch and back up the old client**
```bash
git clone https://github.com/manospep/chord-recommender-app.git
cd chord-recommender-app
git checkout -b feat/lovable-frontend
git mv client client-legacy   # keep for reference until the new one is verified
```

**2. Get the Lovable code**
Clone the Lovable-synced repo (created when you clicked Connect), or use Code Editor → Download codebase.
```bash
git clone <lovable-repo-url> /tmp/lovable-frontend
```

**3. Copy it into `client/`**
Copy everything except `.git`, `node_modules`, `bun.lockb` conflicts:
```bash
mkdir client
rsync -a --exclude .git --exclude node_modules /tmp/lovable-frontend/ client/
```

**4. Verify the frontend builds standalone**
```bash
cd client && bun install && bun run build
```
Fix any path assumptions; nothing should reference the repo root.

**5. Point the frontend at the Railway backend**
The frontend already proxies through server functions using `CHORD_API_URL`. Set it per environment:
- local: `client/.env` → `CHORD_API_URL=http://localhost:8000`
- production: Vercel env var `CHORD_API_URL=https://<your-app>.up.railway.app`

Also keep `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel env vars. Add `client/.env.example` documenting all three.

**6. Configure Vercel**
In the Vercel project settings set **Root Directory = `client`**, framework preset Vite, build command `bun run build`. Redeploy from the branch to confirm.

**7. Confirm Railway is untouched**
Railway root dir stays `server/`. Add CORS for the Vercel domain in FastAPI only if the browser ever calls it directly — with the server-function proxy it usually doesn't.

**8. Delete the legacy client and merge**
Once the Vercel preview deploy is green:
```bash
git rm -r client-legacy
git commit -am "Replace CRA client with Lovable TanStack frontend"
git push -u origin feat/lovable-frontend
```
Open a PR, verify both deploys, merge to `main`.

**9. Ongoing workflow**
Keep building the frontend in Lovable. When ready to release, pull the Lovable repo and sync it into `client/`:
```bash
rsync -a --delete --exclude .git --exclude node_modules /tmp/lovable-frontend/ client/
```
Commit and push. Lovable's two-way sync stays attached to the Lovable repo only.

## Technical notes

- TanStack Start needs a Node/edge runtime on Vercel — the Vite preset handles this; do not set it to a static export.
- `CHORD_API_URL` is read server-side inside handlers, so it must be a Vercel *server* env var, not a `VITE_` one.
- Service-role Supabase keys stay server-side on Railway/Vercel; never prefix them with `VITE_`.
- Keep one lockfile per package folder — don't hoist to a root workspace unless you also update both platform root directories.
