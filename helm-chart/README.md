# FAQ
## What should be configured before installation?
1. You should have configured connection to existed k8s cluster
2. Helm must be installed
3. You should download chart external dependencies, using following commands:
```
   helm repo add bitnami https://charts.bitnami.com/bitnami
   helm repo update
   helm dependency update
```
4. (Optional) Install ingress of your choice (for example: <https://github.com/kubernetes/ingress-nginx>)
5. (Optional) Create certificates for https (for example: <https://github.com/jetstack/cert-manager/>)
6. (Optional) Create values.override.yaml and override there parameters you want
7. Change postgresql password as described below
8. Add ingress to values.override.yaml(example also below)
7. Deploy cvat using command below
## How to deploy new version of chart to cluster?
Execute following command:
```helm upgrade <release_name> --install ./helm-chart -f ./helm-chart/values.yaml  -f values.override.yaml(if exists) --namespace <desired namespace>```
## How to create superuser?
```
HELM_RELEASE_NAMESPACE="<insert>" &&\
HELM_RELEASE_NAME="<insert>" &&\
BACKEND_POD_NAME=$(kubectl get pod --namespace $HELM_RELEASE_NAMESPACE -l tier=backend,app.kubernetes.io/instance=$HELM_RELEASE_NAME -o jsonpath='{.items[0].metadata.name}') &&\
kubectl exec -it --namespace $HELM_RELEASE_NAMESPACE $BACKEND_POD_NAME -c cvat-backend-app-container -- python manage.py createsuperuser
```
## How to change embedded postgresql password?
There are several passwords used here, for security reasons - better change them all.
```
postgresql:
  secret:
    password: cvat_postgresql
    postgres_password: cvat_postgresql_postgres
    replication_password: cvat_postgresql_replica
```
Or, if you know how to work with k8s - you could create your own secret and use it here:
```
postgresql:
   global:
     postgresql:
       existingSecret: cvat-postgres-secret
```
## How to describe ingress:
  Just set `ingress.enabled:` to `true`, then copy example, uncomment it and change values there
## How to understand what diff will be inflicted by 'helm upgrade'?
You can use <https://github.com/databus23/helm-diff#install> for that
## I want to use my own postgresql/redis with your chart.
Just set `postgresql.enabled` or `redis.enabled` to `false`, as described below.
Then - put your instance params to "external" field
## I want to override some settings in values.yaml.
Just create file `values.override.yaml` and place your changes here, using same structure as in `values.yaml`.
Then reference it in helm update/install command using `-f` flag
## Why you used external charts to provide redis and postgres?
Because they definitely know what they do better then we are, so we are getting more quality and less support
## What is kubernetes and how it is working?
See <https://kubernetes.io/>
## What is helm and how it is working?
See <https://helm.sh/>
