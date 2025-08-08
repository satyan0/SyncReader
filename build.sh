#!/bin/bash
# Build script for Heroku deployment

echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Build complete!"
