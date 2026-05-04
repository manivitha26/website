#!/bin/bash
# Deployment script for Google Cloud Run
# Run this script from Google Cloud Shell

echo "🚀 Starting Deployment to Google Cloud Run..."

# Ensure we have the latest code if we are in a git repository
if [ -d ".git" ]; then
    echo "📦 Pulling latest code from git..."
    git pull
fi

# Set the Google Cloud Project ID (Replace with your actual project ID if different)
# If you don't know your project ID, it will use the current default project configured in Cloud Shell.
PROJECT_ID=$(gcloud config get-value project)
echo "🌐 Using Google Cloud Project: $PROJECT_ID"

echo "🚢 Deploying the application..."
gcloud run deploy nexus-platform \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --quiet

echo "✅ Deployment process finished."
