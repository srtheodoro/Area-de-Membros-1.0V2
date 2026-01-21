# Deploy Manual for Hostinger (Node.js)

## 1. Prerequisites
- A GitHub repository with this code.
- A Supabase Project.
- A Hostinger "VPS" or "Cloud" plan (recommended) or Shared Hosting with Node.js support.

## 2. Supabase Setup
1. Go to Supabase > SQL Editor.
2. Copy content from `supabase_schema.sql` and run it.
3. Go to Settings > API. Copy `Project URL` and `anon` public key.
4. Go to Authentication > Providers. Enable Email provider.

## 3. Local Development
1. Create a `.env` file in `client/` (e.g. `client/.env.local` for Vite) with:
   ```
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```
2. Run `npm run client:install`.
3. Run `npm run dev`.

## 4. Hostinger Deploy (Node.js App Feature)
1. **Connect GitHub:** In Hostinger Dashboard, connect your repo.
2. **Environment Variables:**
   - In Hostinger Node.js settings, add environment variables based on `client/.env` but prefix for server if needed.
   - **CRITICAL:** Vite builds at deploy time. It needs the ENV vars *during build*.
   - Create a `.env` file in the `client/` folder on the server or ensure your build script can see Hostinger's env vars.
3. **Build Settings:**
   - **Root Directory:** Leave empty (root).
   - **Build Command:** `npm run build` (This runs `client:install` and `client:build` defined in root package.json).
   - **Start Command:** `npm start` (Runs `node server/index.js`).
4. **App Access:**
   - The server listens on `process.env.PORT`. Hostinger usually passes this automatically.
   - The Express server serves the static files from `client/dist`.

## Troubleshooting
- **White Screen:** Check console. Usually missing Supabase keys.
- **500 Error:** Check Hostinger application logs.
- **Styles missing:** Ensure `client/dist/assets` contains `.css` files and are loaded in `index.html`.
