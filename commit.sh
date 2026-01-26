#!/bin/bash

# Script to commit changes to git

# Check if a commit message was provided
if [ -z "$1" ]; then
    echo "Usage: ./commit.sh 'Commit message'"
    exit 1
fi

COMMIT_MESSAGE=$1

# Stage all changes
git add .

# Commit with the provided message
git commit -m "$COMMIT_MESSAGE"

# Push to remote
git push origin main

echo "Changes committed and pushed successfully!"
