
# 🛠 Blank Screen Resolution Guide

If you are seeing a blank screen after deploying to Render, it is usually due to one of the following three reasons. Follow these steps to diagnose and fix it.

## 1. Diagnose with Browser Console (CRITICAL)
Before changing code, find out the *exact* error:
1. Open your site in Chrome/Edge.
2. Press **F12** (or Right-click > Inspect).
3. Click the **Console** tab.
4. **Common Errors:**
   - `GET .../dist/bundle.js 404 (Not Found)` -> The build didn't run or the folder is missing.
   - `Uncaught ReferenceError: process is not defined` -> The bundler didn't replace `process.env.API_KEY`.
   - `Uncaught SyntaxError: ...` -> The build failed and produced an invalid file.

---

## 2. Check Render Build Settings
Go to your **Render Dashboard** > **Settings** and ensure these are exactly:

- **Build Command:** `npm install && npm run build`
- **Start Command:** `node server.js`

**Wait!** Did you add the `API_KEY` environment variable?
- Go to **Environment** tab in Render.
- Add `API_KEY` with your Gemini key.
- Add `DATABASE_URL` with your Postgres URL.

---

## 3. The `process.env` Issue
In the browser, `process.env` does not exist. Our `esbuild` script replaces `process.env.API_KEY` with the actual key during the build. If the build command in Render doesn't have access to the key *at build time*, it might fail.

**Fix implemented in this update:**
We've updated `package.json` to use a more resilient build script that handles the `dist` directory and environment variables more cleanly.

---

## 4. Path Resolution
Render runs the server from the root. The `server.js` is configured to serve the root and the `/dist` folder.
- Current Path: `https://your-app.onrender.com/dist/bundle.js`
- Ensure your `server.js` contains: `app.use('/dist', express.static(path.join(__dirname, 'dist')));`

---

## 5. Deployment Step-by-Step
1. Commit the changes provided in this update.
2. Push to GitHub.
3. Render will auto-deploy.
4. Watch the **Logs** in Render. You should see `npm run build` finish successfully before `node server.js` starts.
