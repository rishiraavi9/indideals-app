# OAuth Setup Guide

This guide will help you set up Google and Facebook OAuth authentication for the IndiaDeals app.

## Google OAuth Setup

1. **Go to Google Cloud Console**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Google+ API**
   - In the left sidebar, go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"

3. **Create OAuth Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Configure the OAuth consent screen if prompted:
     - User Type: External
     - App name: IndiaDeals
     - User support email: your email
     - Developer contact: your email
   - Application type: Web application
   - Name: IndiaDeals Web Client
   - Authorized JavaScript origins:
     - `http://localhost:5175`
   - Authorized redirect URIs:
     - `http://localhost:3001/api/auth/google/callback`
   - Click "Create"

4. **Copy Credentials**
   - Copy the "Client ID" and "Client secret"
   - Add them to `backend/.env`:
     ```
     GOOGLE_CLIENT_ID=your-client-id-here
     GOOGLE_CLIENT_SECRET=your-client-secret-here
     ```

## Facebook OAuth Setup

1. **Go to Facebook Developers**
   - Visit [Facebook for Developers](https://developers.facebook.com/)
   - Click "My Apps" > "Create App"

2. **Create a New App**
   - Select "Consumer" as the app type
   - App Name: IndiaDeals
   - App Contact Email: your email
   - Click "Create App"

3. **Add Facebook Login**
   - In the app dashboard, click "Add Product"
   - Find "Facebook Login" and click "Set Up"
   - Choose "Web" as the platform
   - Site URL: `http://localhost:5175`
   - Click "Save" and "Continue"

4. **Configure OAuth Settings**
   - Go to "Facebook Login" > "Settings" in the left sidebar
   - Valid OAuth Redirect URIs:
     - `http://localhost:3001/api/auth/facebook/callback`
   - Click "Save Changes"

5. **Get App Credentials**
   - Go to "Settings" > "Basic"
   - Copy "App ID" and "App Secret"
   - Add them to `backend/.env`:
     ```
     FACEBOOK_APP_ID=your-app-id-here
     FACEBOOK_APP_SECRET=your-app-secret-here
     ```

6. **Make App Live (Optional for Development)**
   - For development, the app will work in "Development" mode
   - Only users you add as testers can use it
   - To make it public, switch the app to "Live" mode in the top bar

## Testing OAuth

1. **Restart the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Open the Frontend**
   - Go to `http://localhost:5175`
   - Click "Login / Sign Up"
   - You should see Google and Facebook login buttons

3. **Test Login Flow**
   - Click "Google" or "Facebook" button
   - Complete the OAuth authorization
   - You should be redirected back to the app and logged in

## Troubleshooting

### Google OAuth Issues

- **Error: redirect_uri_mismatch**
  - Make sure the redirect URI in Google Console exactly matches: `http://localhost:3001/api/auth/google/callback`
  - No trailing slash
  - Must be HTTP (not HTTPS) for localhost

- **Error: Access blocked: This app's request is invalid**
  - Make sure you've enabled the Google+ API
  - Complete the OAuth consent screen configuration

### Facebook OAuth Issues

- **Error: URL Blocked**
  - Check that `http://localhost:5175` is in the "App Domains"
  - Check that `http://localhost:3001/api/auth/facebook/callback` is in "Valid OAuth Redirect URIs"

- **Error: App Not Setup**
  - Make sure you've added Facebook Login product to your app
  - Check that OAuth settings are saved

### General Issues

- **Cookies not working**
  - Make sure both frontend and backend are running on localhost (not 127.0.0.1)
  - Check CORS settings in `backend/src/index.ts`

- **Token not being saved**
  - Check browser console for errors
  - Verify localStorage is enabled in your browser

## Production Setup

For production deployment:

1. **Update OAuth URLs**
   - Google Console: Update redirect URI to your production URL
   - Facebook App: Update redirect URI to your production URL

2. **Update Environment Variables**
   - Set `FRONTEND_URL` in backend `.env` to your production frontend URL
   - Update OAuth callback URLs to use your production backend URL

3. **Make Facebook App Live**
   - Switch app mode from "Development" to "Live"
   - Complete App Review if required by Facebook

4. **Enable HTTPS**
   - Both Google and Facebook require HTTPS in production
   - Use a service like Let's Encrypt for free SSL certificates
