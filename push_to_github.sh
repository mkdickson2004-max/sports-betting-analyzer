#!/bin/bash

# Ensure script stops on first error
set -e

# Prompt for repository URL
echo "Please create a new repository on GitHub: https://github.com/new"
echo "Enter the repository URL (e.g., https://github.com/username/repo.git):"
read REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "Error: Repository URL cannot be empty."
    exit 1
fi

# Add remote origin
echo "Adding remote origin..."
git remote add origin "$REPO_URL"

# Push to GitHub
echo "Pushing code to GitHub..."
git branch -M main
git push -u origin main

echo "Successfully pushed to GitHub!"
