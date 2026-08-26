# QTS Planner

Private QTS operating system — planner, knowledge, retrieval practice, resources, and capture. Built for one person across Mac, Windows, and phone.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` → `.env` when you’re ready for Account / OAuth (optional for local-only use).

## Capture

- Authorised recordings **keep audio** in the app vault (IndexedDB).
- **Live transcript** is generated from speech while you record (best in Chrome / Edge).
- Open a capture to replay audio and edit the transcript.

## Account (OAuth)

1. Create a free [Supabase](https://supabase.com) project.
2. Auth → Providers → enable **Google** (and/or Email).
3. Auth → URL config: Site URL + redirect URLs for `http://localhost:5173` and your Vercel domain.
4. Put URL + anon key in `.env` / Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
5. Open **Account** in the app → Continue with Google.

Cloud sync of todos / glossary / files onto that account is the next build step after you sign in once.

## Deploy (Vercel)

1. Push this project to GitHub (init git if needed).
2. [vercel.com](https://vercel.com) → Import the repo → Framework: Vite.
3. Add the two `VITE_SUPABASE_*` env vars.
4. Deploy. SPA rewrites are in `vercel.json`.

```bash
npm run build
```
