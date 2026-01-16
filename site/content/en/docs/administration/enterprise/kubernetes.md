---
title: 'Deployment on Kubernetes'
linkTitle: 'Kubernetes Deployment'
description: 'Guide for deploying CVAT Enterprise on a Kubernetes cluster.'
weight: 2
products:
  - enterprise
---

## Prerequisites

- A Kubernetes cluster kubeVersion >= 1.23.0-0

- kubectl and Helm installed and configured to use the cluster.

- The CVAT Enterprise Docker images (server and UI).


- A private Docker registry, accessible by the Kubernetes cluster. It will be referred to as registry.example below.

- RWX StorageClass must be configured in the cluster.

## Deployment steps

1. Download the Docker images for the desired release.

   - Install AWS CLI. See this <a href="https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html" target="_blank">guide</a> for additional details. Role name
   may be like CvatEnterpriseCustomer or any name which you prefer.

     ```bash
      curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
      unzip awscliv2.zip
      sudo ./aws/install
     ```
   - Install <a href="https://docs.docker.com/engine/install/" target="_blank">docker</a>

   - Create aws config folder and config file (Note: the current file will be overwritten)
     ```bash
      mkdir -p ~/.aws
      cat <<EOF > ~/.aws/config
      [profile CvatEnterpriseCustomer]
      role_arn = <MUST BE PROVIDED BY CVAT TEAM>
      source_profile=CvatEnterpriseCustomer
      external_id = <MUST BE PROVIDED BY CVAT TEAM>

      EOF
     ```
   - Create aws credentials file (Note: the current file will be overwritten):
     ```bash
     cat <<EOF > ~/.aws/credentials
     [CvatEnterpriseCustomer]
     aws_access_key_id = <MUST BE PROVIDED BY CVAT TEAM>
     aws_secret_access_key = <MUST BE PROVIDED BY CVAT TEAM>

     EOF
     ```
   - Verify that the Docker login command succeeds by running the following command:
     ```bash
     aws ecr get-login-password --region eu-west-1 --profile CvatEnterpriseCustomer | docker login --username AWS --password-stdin <MUST BE PROVIDED BY CVAT TEAM>
     ```
   - Pull server and ui images
     ```bash
     docker pull <MUST BE PROVIDED BY CVAT TEAM>/cvat/server_ent:vX.Y.Z
     docker pull <MUST BE PROVIDED BY CVAT TEAM>/cvat/ui_ent:vX.Y.Z
     ```
1. Upload the images to the registry:
   ```bash
   docker login registry.example

   docker tag <MUST BE PROVIDED BY CVAT TEAM>/cvat/server_ent:vX.Y.Z registry.example/cvat/server_ent:vX.Y.Z
   docker tag <MUST BE PROVIDED BY CVAT TEAM>/cvat/ui_ent:vX.Y.Z registry.example/cvat/ui_ent:vX.Y.Z
   docker push registry.example/cvat/server_ent:vX.Y.Z
   docker push registry.example/cvat/ui_ent:vX.Y.Z
   ```
1. Check out the <a href="https://github.com/cvat-ai/cvat" target="_blank">open source CVAT repository</a> at the tag corresponding to the desired release.
1. Unpack the archive with the enterprise chart:
   ```bash
   tar -xvzf cvat_enterprise-*.tgz
   ```
1. Create a file named values.override.yml with the necessary settings, which must contain at least the override for CVAT image registry, as shown in the example below. All supported settings can be obtained in the community version of <a href="https://github.com/cvat-ai/cvat/blob/develop/helm-chart/values.yaml" target="_blank">values.yaml</a>, which is used as a subchart of the enterprise chart, and in the enterprise chart archive, which you should obtain from the CVAT team along with these instructions.
1. Add Enterprise-specific settings to `values.override.yml`:
   ```yaml
   cvat:
     cvat:
       backend:
         image: registry.example/cvat/server_ent
         imagePullPolicy: IfNotPresent

       frontend:
         image: registry.example/cvat/ui_ent
         imagePullPolicy: IfNotPresent
    ```
1. Deploy a Helm release using the chart in the CVAT repository and `values.override.yml`:
   ```bash
   helm upgrade -n dev-ent dev-ent -i --create-namespace ./cvat_enterprise -f ./values.override.yaml
   ```

## Enabling social account authentication or SSO

1. Create an auth_config.yml file as described in {{< ilink "/docs/account_management/sso" "SSO configuration" >}}.
1. Upload it as a secret to the Kubernetes cluster:
   ```bash
   kubectl create secret generic cvat-auth-config --from-file=auth_config.yml
   ```
1. Deploy as in the previous section, but with the following settings added to `values.override.yml`:
   ```yaml
   cvat:
     cvat:
       backend:
         permissionFix:
           enabled: false

         server:
           additionalVolumes:
           - name: auth-config
             secret:
               secretName: cvat-auth-config
           additionalVolumeMounts:
           - mountPath: /home/django/auth_config.yml
             name: auth-config
             subPath: auth_config.yml
   ```
