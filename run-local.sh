#docker-compose down # if already running
# remove cvat_share mentions from docker-compose.yml if causing issues
docker compose -f docker-compose.yml -f docker-compose.dev.yml build
docker-compose up -d --build
#docker exec -it cvat_server bash -ic 'python3 ~/manage.py createsuperuser' # on first deployment to create user

# Goto http://localhost:8080/
