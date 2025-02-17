---

title: 'CVAT deployment on Kubernetes with Helm'
linkTitle: 'CVAT deployment on Kubernetes with Helm'
weight: 1
description: 'Instructions for deploying CVAT on a Kubernetes cluster.'

---

<!--lint disable heading-style-->


- [Prerequisites](#prerequisites)
  - [Installing dependencies](#installing-dependencies)
  - [Optional steps](#optional-steps)
- [Configuration](#configuration)
  - [Postgresql password?](#postgresql-password)
  - [(Optional) Enable Auto annotation feature](#optional-enable-auto-annotation-feature)
  - [Analytics](#analytics)
- [Deployment](#deployment)
  - [With overrides:](#with-overrides)
  - [Without overrides:](#without-overrides)
- [Post-deployment configuration](#post-deployment-configuration)
  - [How to create superuser?](#how-to-create-superuser)
- [FAQ](#faq)
  - [What is kubernetes and how it is working?](#what-is-kubernetes-and-how-it-is-working)
  - [What is helm and how it is working?](#what-is-helm-and-how-it-is-working)
  - [How to setup Minikube](#how-to-setup-minikube)
  - [How to understand what diff will be inflicted by 'helm upgrade'?](#how-to-understand-what-diff-will-be-inflicted-by-helm-upgrade)
  - [I want to use my own postgresql/redis with your chart.](#i-want-to-use-my-own-postgresqlredis-with-your-chart)
  - [I want to override some settings in values.yaml.](#i-want-to-override-some-settings-in-valuesyaml)
  - [Why you used external charts to provide redis and postgres?](#why-you-used-external-charts-to-provide-redis-and-postgres)

## Prerequisites
1. Installed and configured [kubernetes](https://kubernetes.io/) cluster. If you do not already have a cluster,
   you can create one by using [Minikube](https://github.com/kubernetes/minikube/). [How to setup Minikube](#how-to-setup-minikube).
1. Installed [kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl)
1. Installed [Helm](https://helm.sh/).
1. Installed [dependencies](#installing-dependencies)

### Installing dependencies
To install and/or update run:
```shell
helm dependency update
```

### Optional steps
1. Ingress configuration for the Traefik ingress controller is enabled by default.

   Note for Minikube use:
   - because the Traefik creates its main service with `Loadbalanser` type,
     which involve the assignment of externalIP by Cloud, what never happens on Minikube,
     you need to explicitly set the externalIP address for the traefic service.
     Add the following to `values.override.yaml` file:
     ```yaml
     traefik:
       service:
         externalIPs:
           - "your minikube IP (can be obtained with `minikube ip` command)"
     ```
   - Also ensure that your CVAT ingress appears on your hosts file (/etc/hosts).
     You can do this by running this command:
     `cvat.local` is default domainname, you can override it via `values.override.yaml`.
     ```shell
     echo "$(minikube ip) cvat.local" | sudo tee -a /etc/hosts
     ```

## Configuration
1. Create `values.override.yaml` file inside `helm-chart` directory.
1. Fill `values.override.yaml` with new parameters for chart.
1. Override [postgresql password](#postgresql-password)

### Postgresql password?
Put below into your `values.override.yaml`
```yaml
postgresql:
  secret:
    password: <insert_password>
    postgres_password: <insert_postgres_password>
    replication_password: <insert_replication_password>
```
Or create your own secret and use it with:
```yaml
postgresql:
   global:
     postgresql:
       existingSecret: <secret>
```

### (Optional) Enable Auto annotation feature

Before starting, ensure that the following prerequisites are met:
- The Nuclio [CLI (nuctl)](https://nuclio.io/docs/latest/reference/nuctl/nuctl/) is installed.
  To install the CLI, simply [download](https://github.com/nuclio/nuclio/releases)
  the appropriate CLI version to your installation machine.

1. Set `nuclio.enabled: true` in your `values.override.yaml`
1. Run `helm dependency update` in `helm-chart` directory
1. Because Nuclio functions are images that need to be pushed and pulled to/from the registry,
   you need to configure credentials to pull from your preferable registry with the following settings:
   Options:
   - `values.override.yaml` file:
     ```yaml
     registry:
       loginUrl: someurl
       credentials:
         username: someuser
         password: somepass
     ```
   - Or you can create a secret with credentials as described in the [guide](https://nuclio.io/docs/latest/setup/k8s/running-in-production-k8s/#the-preferred-deployment-method)
     and set `registry.secretName=your-registry-credentials-secret-name` in the `values.override.yaml` file.

   - In the case of using Minikube, you can run a local unsecured registry with minikube add-ons:
     ```shell
     minikube addons enable registry
     minikube addons enable registry-aliases
     ```
     Before Docker container images can be pushed to your newly created insecure registry,
     you need to add its address (`$(minikube ip):5000`) to the list of insecure registries to
     instruct Docker to accept working against it:
     follow the instructions in the [Docker documentation](https://docs.docker.com/registry/insecure/#deploy-a-plain-http-registry)

   You might also need to log into your registry account (docker login)
   on the installation machine before running the deployment command.

1. Create cvat project:
   ```shell
   nuctl --namespace <your cvat namespace> create project cvat
   ```
1. Finally deploy the function, i.e.:
   - using minikube registry:
     ```shell
     nuctl deploy --project-name cvat --path serverless/tensorflow/faster_rcnn_inception_v2_coco/nuclio --registry $(minikube ip):5000 --run-registry registry.minikube
     ```
   - using Docker hub:
     ```shell
     nuctl deploy --project-name cvat --path serverless/tensorflow/faster_rcnn_inception_v2_coco/nuclio --registry docker.io/your_username
     ```

### Analytics
Analytics is enabled by default, to disable set `analytics.enabled: false` in your `values.override.yaml`

## Deployment
Make sure you are using correct kubernetes context. You can check it with `kubectl config current-context`.

> **Warning:** The k8s service name of Open Policy Agent is fixed to opa by default.
> This is done to be compatible with CVAT 2.0 but limits this helm chart to a single release per namespace.
> The OPA url currently can´t be set as an environment variable.
> As soon as this is possible you can set cvat.opa.composeCompatibleServiceName
> to false in your value.override.yaml and configure the opa url as additional env.

Execute following command from repo root directory
### With overrides:
```helm upgrade -n <desired_namespace> <release_name> -i --create-namespace ./helm-chart -f ./helm-chart/values.yaml  -f ./helm-chart/values.override.yaml```

### Without overrides:
```helm upgrade -n <desired_namespace> <release_name> -i --create-namespace ./helm-chart -f ./helm-chart/values.yaml```

## Post-deployment configuration

1. Create [super user](#how-to-create-superuser)

### How to create superuser?
```sh
HELM_RELEASE_NAMESPACE="<desired_namespace>" &&\
HELM_RELEASE_NAME="<release_name>" &&\
BACKEND_POD_NAME=$(kubectl get pod --namespace $HELM_RELEASE_NAMESPACE -l tier=backend,app.kubernetes.io/instance=$HELM_RELEASE_NAME,component=server -o jsonpath='{.items[0].metadata.name}') &&\
kubectl exec -it --namespace $HELM_RELEASE_NAMESPACE $BACKEND_POD_NAME -c cvat-backend -- python manage.py createsuperuser
```
## FAQ

### What is kubernetes and how it is working?
See <https://kubernetes.io/>
### What is helm and how it is working?
See <https://helm.sh/>
### How to setup Minikube
1. Please follow the official Minikube installation [guide](https://minikube.sigs.k8s.io/docs/start/)
1. ```shell
   minikube start --addons registry,registry-aliases
   ```
### How to understand what diff will be inflicted by 'helm upgrade'?
You can use <https://github.com/databus23/helm-diff#install> for that
### I want to use my own postgresql with your chart.
Just set `postgresql.enabled` to `false` in the override file, then put the parameters of your database
instance in the `external` field.
You may also need to configure `username`, `database` and `password` fields
to connect to your own database:
```yml
postgresql:
  enabled: false
  external:
    host: postgresql.default.svc.cluster.local
    port: 5432
  auth:
    username: cvat
    database: cvat
  secret:
    password: cvat_postgresql
```
In example above corresponding secret will be created automatically, but if you want to use existing secret change `secret.create` to `false` and set `name` of existing secret:
```yml
postgresql:
  enabled: false
  external:
    host: postgresql.default.svc.cluster.local
    port: 5432
  secret:
    create: false
    name: "my-postgresql-secret"
```
The secret must contain the `database`, `username` and `password`
keys to access to the database
like:
```yml
apiVersion: v1
kind: Secret
metadata:
  name: "my-postgresql-secret"
  namespace: default
type: generic
stringData:
  database: cvat
  username: cvat
  password: secretpassword
```

### I want to use my own redis with your chart.
Just set `redis.enabled` to `false` in the override file, then put the parameters of your Redis
instance in the `external` field.
You may also need to configure `password` field to connect to your own Redis:
```yml
redis:
  enabled: false
  external:
    host: redis.hostname.local
  secret:
    password: cvat_redis
```
In the above example the corresponding secret will be created automatically, but if you want to use an existing secret
change `secret.create` to `false` and set `name` of the existing secret:
```yml
redis:
  enabled: false
  external:
    host: redis.hostname.local
  secret:
    create: false
    name: "my-redis-secret"
```
The secret must contain the `redis-password` key like:
```yml
apiVersion: v1
kind: Secret
metadata:
  name: "my-redis-secret"
  namespace: default
type: generic
stringData:
  redis-password: secretpassword
```

### I want to override some settings in values.yaml.
Just create file `values.override.yaml` and place your changes here, using same structure as in `values.yaml`.
Then reference it in helm update/install command using `-f` flag
### Why you used external charts to provide redis and postgres?
Because they definitely know what they do better then we are, so we are getting more quality and less support
### How to use custom domain name with k8s deployment:
The default value `cvat.local` may be overridden with `--set ingress.hosts[0].host` option like this:
```shell
helm upgrade -n default cvat -i --create-namespace helm-chart -f helm-chart/values.yaml -f helm-chart/values.override.yaml --set ingress.hosts[0].host=YOUR_FQDN
```
### How to fix fail of `helm upgrade` due label field is immutable reason?
If an error message like this:
```shell
Error: UPGRADE FAILED:cannot patch "cvat-backend-server" with kind Deployment: Deployment.apps "cvat-backend-server" is invalid: spec.selector: Invalid value: v1.LabelSelector{MatchLabels:map[string]string{"app":"cvat-app", "app.kubernetes.io/instance":"cvat", "app.kubernetes.io/managed-by":"Helm", "app.kubernetes.io/name":"cvat", "app.kubernetes.io/version":"latest", "component":"server", "helm.sh/chart":"cvat", "tier":"backend"}, MatchExpressions:[]v1.LabelSelectorRequirement(nil)}: field is immutable
```
To fix that, delete CVAT Deployments before upgrading
```shell
kubectl delete deployments --namespace=foo -l app=cvat-app
```
### How to use existing PersistentVolume to store CVAT data instead of default storage
It is assumed that you have created a PersistentVolumeClaim named `my-claim-name`
and a PersistentVolume that backing the claim.
Claims must exist in the same namespace as the Pod using the claim.
For details [see](https://kubernetes.io/docs/concepts/storage/persistent-volumes).
Add these values in the `values.override.yaml`:
```yaml
cvat:
  backend:
    permissionFix:
      enabled: false
    defaultStorage:
      enabled: false
    server:
      additionalVolumes:
        - name: cvat-backend-data
          persistentVolumeClaim:
            claimName: my-claim-name
    worker:
      export:
        additionalVolumes:
          - name: cvat-backend-data
            persistentVolumeClaim:
              claimName: my-claim-name
      import:
        additionalVolumes:
          - name: cvat-backend-data
            persistentVolumeClaim:
              claimName: my-claim-name
      annotation:
        additionalVolumes:
          - name: cvat-backend-data
            persistentVolumeClaim:
              claimName: my-claim-name
    utils:
      additionalVolumes:
        - name: cvat-backend-data
          persistentVolumeClaim:
            claimName: my-claim-name

```
