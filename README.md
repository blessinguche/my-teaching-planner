# Teaching Planner

Private teaching planner — schools, central calendar, QTS training tools, knowledge, practice, and capture. Built for one person across Mac, Windows, and phone.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` → `.env` for Account (required to use the app).

## Areas

- **Hub:** Central calendar for QTS + school events, deadlines, and meetings.
- **Schools:** Create a school (Clayton Hall Academy is seeded) → lesson plans, timetable, roster, attendance, grades, behaviour, homework, comms, and more.
- **QTS:** Training dashboard, to-dos, deadlines, learn, quiz, links, and capture — own side nav.
- **Account:** Sign-in. To-do / Learn / Due / Quiz sync with the account. Captures stay on-device.

## Capture

- Authorised recordings **keep audio** in the app vault (IndexedDB).
- **Live transcript** is generated from speech while you record (best in Chrome / Edge).
- Open a capture to replay audio and edit the transcript.

## Account

1. Create a free [Supabase](https://supabase.com) project.
2. Auth → Providers → enable **Email** (password).
3. Auth → URL config: Site URL + redirect URLs for `http://localhost:5173` and your Vercel domain.
4. Put URL + anon key in `.env` / Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`).
5. SQL Editor → paste `supabase/schema.sql` → Run (once). The app also shows this SQL if the table is missing.
6. Open **Account** in the app → create / sign in.

## Deploy (Vercel)

1. Push this project to GitHub (init git if needed).
2. [vercel.com](https://vercel.com) → Import the repo → Framework: Vite.
3. Add the two `VITE_SUPABASE_*` env vars.
4. Deploy. SPA rewrites are in `vercel.json`.

```bash
npm run build
```
