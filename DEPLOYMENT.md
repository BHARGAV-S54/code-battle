
# 🚀 Deployment Guide: CODE Battle Arena

Follow these steps to deploy your competitive programming platform to **Render.com**.

## Prerequisites
1. A **GitHub** repository containing your code.
2. A **Google Gemini API Key** (from [AI Studio](https://aistudio.google.com/)).
3. A **Render.com** account.

---

## Step 1: Create a PostgreSQL Database
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **PostgreSQL**.
3. Name: `code-battle-db`.
4. Region: Choose the one closest to you.
5. Plan: **Free** (or Starter for production).
6. Click **Create Database**.
7. **Important**: Once created, copy the **Internal Database URL** (for Render services) or **External Database URL** (for local testing).

---

## Step 2: Deploy the Web Service
1. Click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. **Configuration Settings**:
   - **Name**: `code-battle`
   - **Environment**: `Node`
   - **Region**: Same as your database.
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server.js`
4. **Environment Variables**:
   Click **Advanced** > **Add Environment Variable**:
   - `API_KEY`: (Your Google Gemini API Key)
   - `DATABASE_URL`: (The Internal Database URL from Step 1)
   - `NODE_ENV`: `production`

---

## Step 3: Initialize the Arena
1. Once the deployment status turns to **Live**, open your URL (e.g., `https://code-battle-u0tf.onrender.com`).
2. Log in as Admin:
   - **ID**: `admin`
   - **Password**: `bhargav`
3. Go to the **System Setup** tab to verify that the Database Connection shows **Authenticated**.

---

## Troubleshooting "Empty Screen"
If you see a blank screen after deployment:
1. Ensure `npm run build` finished successfully in the Render logs.
2. Check that the `dist/bundle.js` file exists.
3. Open the browser console (F12) to see if there are 404 errors for the script file.
