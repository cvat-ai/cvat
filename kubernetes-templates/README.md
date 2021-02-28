# Deploying cvat in a kubernetes cluster

This guide will focus on how to deploy cvat in an kubernetes environment. It was tested on Kubernetes v1.19.3 but should work for >=v1.9, eventhough it is untested.

## Building the container
In order to do so, you will first need to build the cvat backend and frontend images and push them to a registry that you can pull from within the cluster
```
echo "Building backend"
docker build --cache-from $CI_REGISTRY_IMAGE/backend:release-1.1.0 \
  --build-arg TF_ANNOTATION=no --build-arg AUTO_SEGMENTATION=no \
  --build-arg WITH_TESTS=no --build-arg TZ="Etc/UTC" --build-arg OPENVINO_TOOLKIT=no \
  --build-arg USER=django --build-arg DJANGO_CONFIGURATION=production \
  --build-arg TZ="Etc/UTC" .
docker push $CI_REGISTRY_IMAGE/backend:release-1.1.0

echo "Building frontend"
docker build --file Dockerfile.ui \
  --tag $CI_REGISTRY_IMAGE/frontend:release-1.1.0 - .
docker push $CI_REGISTRY_IMAGE/frontend:release-1.1.0
```


## Adjusting the kubernetes templates

1. Replace the URL pointing to the backend and fronend image in `kubernetes-templates/04_cvat_backend_deployment.yml` and `kubernetes-templates/04_cvat_frontend_deployment.yml`. Furthermore adjusting their pull secrets

2. Replacing the domain dummy with your real domain name `cvat.my.cool.domain.com`. Replace `{MY_SERVER_URL_COM}` in `kubernetes-templates/04_cvat_frontend_deployment.yml` and `kubernetes-templates/05_cvat_proxy_configmap.yml`.

3. Insert your choosen database password the `kubernetes-templates/02_database_secrets.yml`

## Deploying to the cluster
Deploy everything to your cluster with `kubectl apply -f kubernetes-templates/`

## Create the django super user

```
kubectl get pods --namespace cvat
kubectl --namespace cvat exec -it cvat-backend-78c954f84f-qxb8b -- /bin/bash
python3 ~/manage.py createsuperuser
```
