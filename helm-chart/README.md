# FAQ

## What should be configured before installation?

1. You should have configured connection to existed k8s cluster. If you do not already have a cluster,
   you can create one by using [Minikube](https://github.com/kubernetes/minikube/)
   which is a tool that lets you run Kubernetes locally.
1. Helm must be installed
1. You should download chart external dependencies, using following commands:

   ```shell
   helm dependency update
   ```

1. (Optional) Create values.override.yaml and override there parameters you want.
   See the [note](#how_to_describe_ingress) about Minikube use.
1. (Optional) Create certificates for https (for example: <https://github.com/jetstack/cert-manager/>).
   This step is not yet covered in this guide.
1. Change postgresql password as described below
1. Create a rules.tar.gz archive containing all OPA rules inside this `helm-chart` directory.
   ```shell
   find ../cvat/apps/iam/rules -name "*.rego" -and ! -name '*test*' -exec basename {} \; | tar -czf rules.tar.gz -C ../cvat/apps/iam/rules/ -T -
   ```
1. Deploy cvat using command below

> **Warning:** The k8s service name of Open Policy Agent is fixed to opa by default.
> This is done to be compatible with CVAT 2.0 but limits this helm chart to a single release.
> The OPA url currently can´t be set as an environment variable.
> As soon as this is possible you can set cvat.opa.composeCompatibleServiceName to false
> in your value.override.yaml and configure those as additional envs.

## How to deploy new version of chart to cluster?

Execute following command:
```helm upgrade <release_name> --install ./helm-chart -f ./helm-chart/values.yaml  -f values.override.yaml(if exists) --namespace <desired namespace>```

## How to create superuser?

```shell
HELM_RELEASE_NAMESPACE="<insert>" &&\
HELM_RELEASE_NAME="<insert>" &&\
BACKEND_POD_NAME=$(kubectl get pod --namespace $HELM_RELEASE_NAMESPACE -l tier=backend,app.kubernetes.io/instance=$HELM_RELEASE_NAME -o jsonpath='{.items[0].metadata.name}') &&\
kubectl exec -it --namespace $HELM_RELEASE_NAMESPACE $BACKEND_POD_NAME -c cvat-app-backend-server-container -- python manage.py createsuperuser
```

## How to change embedded postgresql password?

There are several passwords used here, for security reasons - better change them all.

```yaml
postgresql:
  secret:
    password: cvat_postgresql
    postgres_password: cvat_postgresql_postgres
    replication_password: cvat_postgresql_replica
```

Or, if you know how to work with k8s - you could create your own secret and use it here:

```yaml
postgresql:
   global:
     postgresql:
       existingSecret: cvat-postgres-secret
```


## How to enable Auto annotation feature

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
     Before Docker container images can be pushed to your newly created unsecure registry,
     you need to add its address ($(minikube ip):5000) to the list of unsecure registries to
     instruct Docker to accept working against it:
     follow the instructions in the [Docker documentation](https://docs.docker.com/registry/insecure/#deploy-a-plain-http-registry)

   You might also need to log into your registry account (docker login)
   on the installation machine before running the deployment command.

1. Create cvat project:
   ```shell
   nuctl --namespace <your cvat namespace> create project cvat
   ```
1. Finaly deploy the fuction, i.e.:
  - using minikube registry:
    ```shell
    nuctl deploy --project-name cvat --path serverless/tensorflow/faster_rcnn_inception_v2_coco/nuclio --registry $(minikube ip):5000 --run-registry registry.minikube
    ```
  - using Docker hub:
    ```shell
    nuctl deploy --project-name cvat --path serverless/tensorflow/faster_rcnn_inception_v2_coco/nuclio --registry docker.io/your_username
    ```

## How to enable Analytics

1. Set `analytics.enabled: true` in your `values.override.yaml`
1. Run `helm dependency update` in `helm-chart` directory
1. Since custom images are required here, you will need to create them yourself
   and push them to your preferred docker registry.
   You might also need to log into your registry account (docker login)
   on the installation machine before running the push command.
   How to set up local registry when using Minikube see [previous section](#how_to_enable_auto_annotation_feature)

   - Let's build custom elasticsearch, logstash and kibana images with the following command
     ```shell
     docker-compose -f docker-compose.yml  -f components/analytics/docker-compose.analytics.yml build
     ```

   - Tag images:
     ```shell
     docker tag cvat_kibana:latest <your registry>/cvat_kibana:latest
     docker tag cvat_elasticsearch:latest <your registry>/cvat_elasticsearch:latest
     docker tag cvat_logstash:latest <your registry>/cvat_logstash:latest
     ```

   - Push to registry
     ```shell
     docker push <your registry>/cvat_kibana:latest
     docker push <your registry>/cvat_elasticsearch:latest
     docker push <your registry>/cvat_logstash:latest
     ```

   - Add corresponding settings into `values.override.yaml`, i.e. for minikube registry:
     ```yaml
      logstash:
        image: "registry.minikube/cvat_logstash"
        imageTag: "latest"

      elasticsearch:
        image: "registry.minikube/cvat_elasticsearch"
        imageTag: "latest"

      kibana:
        image: "registry.minikube/cvat_kibana"
        imageTag: "latest"
     ```

   - Deploy
     ```shell
     helm upgrade <release_name> --namespace <desired namespace>  --install ./helm-chart -f ./helm-chart/values.yaml  -f values.override.yaml
     ```
## How to describe ingress

  Ingress configuration for the Traefik ingress controller is enabled by default.
  Note for Minikube use: because the Traefik creates its main service with `Loadbalanser` type,
  which involve the assignment of externalIP by Cloud, what never happens on Minikube,
  you need to explicitly set the externalIP address for the traefic service with:
   ```yaml
  traefik:
    service:
      externalIPs:
        - "your minikube ip"
  ```

## How to understand what diff will be inflicted by 'helm upgrade'?

You can use <https://github.com/databus23/helm-diff#install> for that

## I want to use my own postgresql/redis with your chart

Just set `postgresql.enabled` or `redis.enabled` to `false`, as described below.
Then - put your instance params to "external" field

## I want to override some settings in values.yaml

Just create file `values.override.yaml` and place your changes here, using same structure as in `values.yaml`.
Then reference it in helm update/install command using `-f` flag

## Why you used external charts to provide redis and postgres?

Because they definitely know what they do better then we are, so we are getting more quality and less support

## What is kubernetes and how it is working?

See <https://kubernetes.io/>

## What is helm and how it is working?

See <https://helm.sh/>
