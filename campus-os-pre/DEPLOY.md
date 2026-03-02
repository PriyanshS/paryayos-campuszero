# ParyayOS – Deployment (Firebase + Local Backend)

## Overview

- **Frontend**: React (Vite) → deploy to **Firebase Hosting**.
- **Backend**: FastAPI (uvicorn) + **local SQLite** → run on your own server or machine (Firebase does not run the Python backend).
- **Database**: Local only (`server/campus_os.db`). No MongoDB Atlas or other cloud DB required.

## 1. Local development

### Backend (uvicorn)

From the project root (`campus-os-pre`):

```bash
cd server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or from repo root:

```bash
cd campus-os-pre/server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (Vite)

In another terminal, from `campus-os-pre`:

```bash
npm install
npm run dev
```

Open http://localhost:3000. The app talks to the backend at `http://localhost:8000`.

## 2. Firebase Hosting (frontend only)

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Replace the default project in `.firebaserc` with your Firebase project ID.
4. Build the frontend:

   ```bash
   npm run build
   ```

5. Deploy:

   ```bash
   firebase deploy
   ```

The `firebase.json` is set to serve the **dist** folder and rewrite all routes to `index.html` (SPA). The backend is **not** deployed to Firebase; it must run elsewhere.

## 3. Local database hooks for production

- The app uses the **local SQLite** database configured in `server/database.py` (`sqlite:///./campus_os.db`).
- When you run uvicorn on a server, the DB file is created/used in the **current working directory** of the server process (typically `server/` if you run from there).
- For production:
  - Run uvicorn on a VM/container and keep `campus_os.db` on that machine (or mount a volume).
  - Do **not** use a cloud DB unless you change `database.py` (e.g. to PostgreSQL) and env vars.
- Point the frontend to your backend URL: set `VITE_API_URL` (or equivalent) at build time if you use it in the app, or configure the API base URL in your frontend env so the built app calls the correct backend after deploy.

## 4. Optional: Backend API URL for production build

If you use a single base URL for the API, you can add in `vite.config.ts`:

```ts
define: {
  'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:8000'),
}
```

Then in the frontend use `process.env.VITE_API_URL` instead of hardcoded `http://localhost:8000` when making API calls. For production builds set `VITE_API_URL=https://your-backend.com` before `npm run build`.

## 5. Environment variables

- **Backend**: `HUGGINGFACE_API_KEY` for AI advice/KPI suggestions; optional.
- **Frontend**: Optional `VITE_API_URL` for production API base URL (see above).
