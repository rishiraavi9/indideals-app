#!/bin/bash
set -e

echo "=€ Starting IndiaDeals Production Environment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "L Error: .env file not found!"
    echo "   Copy .env.production.example to .env and fill in your values"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Build and start with Docker Compose
echo "=æ Building containers..."
docker-compose build

echo "=Ä Starting database services..."
docker-compose up -d postgres redis

# Wait for database to be ready
echo "ó Waiting for database to be ready..."
sleep 10

echo "= Running database migrations..."
docker-compose run --rm backend npm run db:migrate

echo "=€ Starting all services..."
docker-compose up -d

echo ""
echo " IndiaDeals is now running!"
echo ""
echo "=Ê Services:"
echo "   - Frontend: http://localhost"
echo "   - Backend API: http://localhost/api"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis: localhost:6379"
echo "   - Elasticsearch: localhost:9200"
echo ""
echo "=Ý Useful commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop: docker-compose down"
echo "   - Restart: docker-compose restart"
