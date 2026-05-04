#!/bin/bash
# Deployment script for Google Cloud Run
# Run this script from Google Cloud Shell

echo "🚀 Starting Deployment to Google Cloud Run..."

# Ensure we have the latest code if we are in a git repository
if [ -d ".git" ]; then
    echo "📦 Pulling latest code from git..."
    git pull
fi

# Set the Google Cloud Project ID
PROJECT_ID="nexus-495318"
echo "🌐 Setting Google Cloud Project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

echo "🚢 Deploying the application..."
gcloud run deploy nexus-platform \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --project $PROJECT_ID \
  --quiet

echo "✅ Deployment process finished."
