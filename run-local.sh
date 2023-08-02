docker-compose down # if already running
docker compose -f docker-compose.yml -f docker-compose.dev.yml build
docker-compose up -d --build
