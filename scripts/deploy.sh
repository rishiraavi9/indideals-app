#!/bin/bash
set -e

echo "=€ Deploying IndiaDeals..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "L Error: .env file not found!"
    exit 1
fi

# Pull latest code
echo "=å Pulling latest code..."
git pull origin main

# Build frontend
echo "=( Building frontend..."
cd frontend
npm ci
npm run build
cd ..

# Build backend
echo "=( Building backend..."
cd backend
npm ci
npm run build
cd ..

# Run database migrations
echo "=Ä Running database migrations..."
cd backend
npm run db:migrate
cd ..

# Restart services
echo "= Restarting services..."
docker-compose down
docker-compose up -d --build

echo ""
echo " Deployment complete!"
echo ""
echo "= Check service health:"
echo "   docker-compose ps"
echo "   docker-compose logs -f"
