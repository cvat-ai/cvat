# CVAT chart manual

- [CVAT chart manual](#cvat-chart-manual)
  - [Prerequisites](#prerequisites)
    - [Installing dependencies](#installing-dependencies)
    - [Optional steps](#optional-steps)
  - [Configuration](#configuration)
    - [Postgresql password?](#postgresql-password)
    - [Ingress parameters](#ingress-parameters)
  - [Deployment](#deployment)
    - [With overrides:](#with-overrides)
    - [Without overrides:](#without-overrides)
  - [Post-deployment configuration](#post-deployment-configuration)
    - [How to create superuser?](#how-to-create-superuser)
  - [FAQ](#faq)
    - [What is kubernetes and how it is working?](#what-is-kubernetes-and-how-it-is-working)
    - [What is helm and how it is working?](#what-is-helm-and-how-it-is-working)
    - [How to enable ingress:](#how-to-enable-ingress)
    - [How to understand what diff will be inflicted by 'helm upgrade'?](#how-to-understand-what-diff-will-be-inflicted-by-helm-upgrade)
    - [I want to use my own postgresql/redis with your chart.](#i-want-to-use-my-own-postgresqlredis-with-your-chart)
    - [I want to override some settings in values.yaml.](#i-want-to-override-some-settings-in-valuesyaml)
    - [Why you used external charts to provide redis and postgres?](#why-you-used-external-charts-to-provide-redis-and-postgres)

## Prerequisites
1. Installed and configured [kubernetes](https://kubernetes.io/) cluster.
2. Installed [kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl)
3. Installed [Helm](https://helm.sh/).
4. Installed [dependencies](#installing-dependencies)

### Installing dependencies
To install and/or update run:
```sh
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm dependency update
```

### Optional steps
1. Install ingress of your choice (for example: <https://github.com/kubernetes/ingress-nginx>)
2. Create certificates for https (for example: <https://github.com/jetstack/cert-manager/>)

## Configuration
1. Create `values.override.yaml` file inside `helm-chart` directory.
2. Fill `values.override.yaml` with new parameters for chart.
3. Override [postgresql password](#postgresql-password)
4. Create a rules.tar.gz archive containing all OPA rules inside this `helm-chart` directory.
  ```sh
  find ../cvat/apps/iam/rules -name "*.rego" -and ! -name '*test*' -exec basename {} \; | tar -czf rules.tar.gz -C ../cvat/apps/iam/rules/ -T -
  ```
5. (Optional) Add [ingress parameters](#ingress-parameters)

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

### Ingress parameters
Paste below parameters to `values.override.yaml`
```yaml
ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: nginx
    kubernetes.io/tls-acme: "true"
    ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/secure-backends: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "120"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "120"
    cert-manager.io/cluster-issuer: <issuer_name>
  hosts:
    - host: <your_domain>
      paths:
        - path: "/api/.*|git/.*|tensorflow/.*|auto_annotation/.*|analytics/.*|static/.*|admin|admin/.*|documentation/.*|dextr/.*|reid/.*"
          service:
            name: <release_name>-backend-service
            port: 8080
        - path: "/"
          pathType: "Prefix"
          service:
            name: <release_name>-frontend-service
            port: 80

  tls:
    - hosts:
        - <your_domain>
      secretName: ingress-tls-cvat
```

## Deployment
Make sure you are using correct kubernetes context. You can check it with `kubectl config current-context`.

> **Warning:** The k8s service name of Open Policy Agent is fixed to opa by default.
This is done to be compatible with CVAT 2.0 but limits this helm chart to a single release per namespace.
The OPA url currently can´t be set as an environment variable.
As soon as this is possible you can set cvat.opa.composeCompatibleServiceName
to false in your value.override.yaml and configure the opa url as additional env.

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
BACKEND_POD_NAME=$(kubectl get pod --namespace $HELM_RELEASE_NAMESPACE -l tier=backend,app.kubernetes.io/instance=$HELM_RELEASE_NAME -o jsonpath='{.items[0].metadata.name}') &&\
kubectl exec -it --namespace $HELM_RELEASE_NAMESPACE $BACKEND_POD_NAME -c cvat-backend-app-container -- python manage.py createsuperuser
```

## FAQ

### What is kubernetes and how it is working?
See <https://kubernetes.io/>
### What is helm and how it is working?
See <https://helm.sh/>
### How to enable ingress:
  Just set `ingress.enabled:` to `true`, then copy example, uncomment it and change values there
### How to understand what diff will be inflicted by 'helm upgrade'?
You can use <https://github.com/databus23/helm-diff#install> for that
### I want to use my own postgresql/redis with your chart.
Just set `postgresql.enabled` or `redis.enabled` to `false`, as described below.
Then - put your instance params to "external" field
### I want to override some settings in values.yaml.
Just create file `values.override.yaml` and place your changes here, using same structure as in `values.yaml`.
Then reference it in helm update/install command using `-f` flag
### Why you used external charts to provide redis and postgres?
Because they definitely know what they do better then we are, so we are getting more quality and less support
