
# Hi360 Studio | Professional Deployment Guide (No PC Required)

Since you don't have a PC, we use **GitHub Actions** as your "Virtual PC" to build and deploy your app.

## Step 1: Push to GitHub
1. Create a repository on [GitHub](https://github.com/new).
2. Upload all these project files to the repository.

## Step 2: Link Firebase to GitHub (Using your Phone)
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: `hi360-4c2de`.
3. In the left menu, go to **Build** -> **Hosting**.
4. Click **Get Started**.
5. When it asks you to "Set up GitHub Actions", click **Log in to GitHub**.
6. Follow the prompts to authorize Firebase to access your repository.
7. It will automatically create a "Service Account Key" and save it to your GitHub Secrets.

## Step 3: Automated Deployment
- Every time you edit a file on GitHub and click "Commit", the GitHub Action I created (`.github/workflows/firebase-hosting-merge.yml`) will wake up.
- It will take your code, check it for errors, and push it to your `hi360-4c2de.web.app` URL automatically.

## How to manage the app from Mobile
- **For Code Changes:** Use the GitHub website/app.
- **For App Usage:** Open the URL in Chrome/Safari and select "Add to Home Screen" to use it like a native app.
- **For Tracking:** Use the Firebase Console to monitor your audio traffic and user signups.
