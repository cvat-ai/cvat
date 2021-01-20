# Deploy Cvat UI to App Engine
1. Create GCP Service Account with IAM Roles
- App Engine Admin
- Storage Object Admin
- Service Account User

2. SSH to cvat_ui_gcp container
```
docker container exec -it cvat_ui_gcp /bin/bash
```

3. Create App Engine in region: asia-northeast1
```
gcloud app deploy
```

# Deploy Cvat Backend API to Cloud Run
1. Create GCP Service Account with IAM Roles
2. SSH to cvat_api_gcp container
```
docker container exec -it cvat_api_gcp /bin/bash
```