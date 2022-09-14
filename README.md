# Computer Vision Annotation Tool (CVAT) - Bossa Nova Fork

- [Official CVAT Repo](https://github.com/opencv/cvat)
- [CVAT documentation](https://opencv.github.io/cvat/docs)


## Running CVAT in Bossa Nova GCP

- Docker and other pre-reqs come installed in the Compute Engine VMs
- cvat-server and cvat-ui images built from our changes pushed to Container Registry (currently in the cvat-dev-rob project)
- docker-compose.no-infra.yaml uses those images, and doesn't run postgres or redis since we have the managed instances
- Endpoints for managed Postgres and Redis instances need to be configured as environment variables
  - CVAT_REDIS_HOST - url of redis instance
  - CVAT_POSTGRES_HOST - url of postgres instance


A theoretical startup script to run everything:
```
export CVAT_REDIS_HOST=whatever
export CVAT_POSTGRES_HOST=whatever
docker-compose -f docker-compose.no-infra.yml up
```

We can docker-compose up/down just the cvat-ui service to deploy new versions