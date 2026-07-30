# ChordQuest

Find songs from the chords you know. ChordQuest helps beginner guitarists discover music to play and learn.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/879df2b7-df5b-4885-aa99-c08c772affe8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
cp .env.example .env
npm run dev
```

## Environment

See `.env.example`. `CHORD_API_URL` points at the FastAPI backend (Railway);
when unset the app serves a built-in sample catalog.

## Deploying alongside the FastAPI backend

This frontend is meant to live in `client/` of the `chord-recommender-app`
repo, with the FastAPI backend in `server/`. See [MIGRATION.md](./MIGRATION.md)
for the step-by-step merge, Vercel and Railway setup, and the ongoing sync
workflow.

