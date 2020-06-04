## Tracking
This components allows to track bounding boxes in consecutive images.

### Build docker image
```bash
# From project root directory
docker-compose -f docker-compose.yml -f components/tracking/docker-compose.tracking.yml build
```

### Run docker container
```bash
# From project root directory
docker-compose -f docker-compose.yml -f components/tracking/docker-compose.tracking.yml up -d
```
