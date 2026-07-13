# Deployment Guide

You can make your Geo Map Visualizer publicly available for free using services like **Vercel** or **Netlify**. Both are excellent for Vite/React apps.

## Option 1: Vercel (Recommended)
Vercel is the creators of Next.js and has first-class support for Vite.

### Method A: Drag & Drop (Easiest)
1.  Run the build command in your terminal:
    ```bash
    npm run build
    ```
2.  This will create a `dist` folder in your project directory.
3.  Go to [vercel.com](https://vercel.com) and sign up/login.
4.  Click **"Add New"** -> **"Project"**.
5.  There may be a "Drag & Drop" interaction or "Import from Git". If you don't use Git, you can install the Vercel CLI.

### Method B: Vercel CLI (Professional)
1.  Install Vercel CLI globally:
    ```bash
    npm i -g vercel
    ```
2.  Run the deploy command in your project folder:
    ```bash
    vercel
    ```
3.  Follow the prompts:
    -   Set up and deploy? **Yes**
    -   Which scope? **(Select your account)**
    -   Link to existing project? **No**
    -   Project name? **geo-map-visualizer**
    -   Directory? **./**
    -   Want to modify settings? **No** (Vite settings are auto-detected)
4.  It will give you a "Production" URL (e.g., `https://geo-map-visualizer.vercel.app`).

---

## Option 2: Netlify (Drag & Drop)
1.  Run the build command:
    ```bash
    npm run build
    ```
2.  Go to [netlify.com](https://www.netlify.com) and sign up.
3.  In your dashboard, look for **"Add new site"** -> **"Deploy manually"**.
4.  Drag your `dist` folder (created in step 1) onto the drop zone.
5.  Your site will be live instantly!

## key Note on Routing
If you add multiple pages later, you might need a `vercel.json` or `_redirects` file to handle client-side routing, but for this single-page map app, the defaults usually work perfectly.
