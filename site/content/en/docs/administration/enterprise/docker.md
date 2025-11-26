---
title: 'Deployment with Docker Compose'
linkTitle: 'Docker Compose Deployment'
description: 'Instructions for deploying CVAT Enterprise using Docker Compose.'
weight: 1
products:
  - enterprise
---

## AWS requirements to create, run and manage VMs

IAM user should have the folloing permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "ec2:DescribeImages",
                "ec2:DescribeInstanceTypes",
                "ec2:DescribeKeyPairs",
                "ec2:DescribeVpcs",
                "ec2:DescribeSubnets",
                "ec2:DescribeSecurityGroups",
                "ec2:DescribeSecurityGroupRules",
                "ec2:DescribeVolumes",
                "ec2:DescribeAvailabilityZones",
                "ec2:CreateSecurityGroup",
                "ec2:AuthorizeSecurityGroupIngress",
                "ec2:AuthorizeSecurityGroupEgress",
                "ec2:RevokeSecurityGroupIngress",
                "ec2:RevokeSecurityGroupEgress",
                "ec2:ModifySecurityGroupRules",
                "ec2:UpdateSecurityGroupRuleDescriptionsIngress",
                "ec2:UpdateSecurityGroupRuleDescriptionsEgress",
                "ec2:CreateKeyPair",
                "ec2:CreateTags",
                "ec2:DescribeAddresses",
                "ec2:AllocateAddress",
                "ec2:AssociateAddress",
                "ec2:RunInstances",
                "elasticfilesystem:DescribeFileSystems",
                "elasticfilesystem:CreateFileSystem",
                "elasticfilesystem:TagResource",
                "elasticfilesystem:CreateMountTarget",
                "elasticfilesystem:DescribeMountTargets"
            ],
            "Resource": "*"
        }
    ]
}
```

Currently, the Amazon EC2 Describe* API actions do not support resource-level permissions,
so you cannot restrict which individual resources users can view.
However, you can apply resource-level permissions on the ec2:RunInstances API
action to restrict which resources users can use to launch an instance.
The launch fails if users select options that they are not authorized to use.
See this <a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-policies-ec2-console.html" target="_blank">guide</a> for details.

## Prepare the environment to obtain CVAT Enterprise images (Customer side actions).

### How to configure the environment in case non AWS EC2 instance

1. Install AWS CLI. See this <a href="https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html" target="_blank">guide</a> for additional details. Role name may be like `CvatEnterpriseCustomer`
or any name which you prefer.

   ```bash
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```
1. Install <a href="https://docs.docker.com/engine/install/" target="_blank">docker</a>
1. Create aws config folder and
config file (Note: the current file will be overwritten):
   ```bash
   mkdir -p ~/.aws
   cat <<EOF > ~/.aws/config
   [profile CvatEnterpriseCustomer]
   role_arn = arn:aws:iam::443536374637:role/CvatEnterpriseCustomerRole
   source_profile=CvatEnterpriseCustomer
   external_id = <MUST BE PROVIDED BY CVAT TEAM>

   EOF
   ```
1. Create aws credentials file (Note: the current file will be overwritten):

   ```bash
   cat <<EOF > ~/.aws/credentials
   [CvatEnterpriseCustomer]
   aws_access_key_id = <MUST BE PROVIDED BY CVAT TEAM>
   aws_secret_access_key = <MUST BE PROVIDED BY CVAT TEAM>

   EOF
   ```
1. Verify that the Docker login command succeeds by running the following command:

   ```bash
   aws ecr get-login-password --region eu-west-1 --profile CvatEnterpriseCustomer | docker login --username AWS --password-stdin 443536374637.dkr.ecr.eu-west-1.amazonaws.com
   ```
### How to configure the environment in case AWS EC2 instance

1. Create an IAM instance profile for Amazon EC2 instance with the following see this <a href="https://docs.aws.amazon.com/codedeploy/latest/userguide/getting-started-create-iam-instance-profile.html" target="_blank">guide</a> for additional details.

   - Trusted entities:

   ```json
      {
   "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "Statement1",
         "Effect": "Allow",
         "Principal": {
           "Service": "ec2.amazonaws.com"
         },
         "Action": "sts:AssumeRole"
       }
     ]
   }
   ```
   - Policy

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "AllowToAssumeCrossAccountRole",
         "Effect": "Allow",
         "Action": "sts:AssumeRole",
         "Resource": "arn:aws:iam::443536374637:role/   CvatEnterpriseCustomerRole"
       }
     ]
   }
   ```

1. Provide CVAT team role arn (arn:aws:iam::221082170770:role/CvatEnterpriseCustomer) to provide access to the CVAT ECR.
1. Create an EC2 instance and attach the IAM role from the step above to the EC2 instance.
1. Login to the instance with SSH.
1. Install AWS CLI. See this <a href="https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html" target="_blank">guide</a> for additional details. Role name may be like CvatEnterpriseCustomer or any name which you prefer.
   ```bash
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```
1. Install <a href="https://docs.docker.com/engine/install/" target="_blank">docker</a>
1. Create aws config folder and config file:
   ```bash
   mkdir ~/.aws
   cat <<EOF > ~/.aws/config
   [profile CvatEnterpriseCustomer]
   role_arn = arn:aws:iam::443536374637:role/CvatEnterpriseCustomerRole
   credential_source = Ec2InstanceMetadata

   EOF
   ```
1. Verify that the Docker login command succeeds by running the following command:

   ```bash
   aws ecr get-login-password --region eu-west-1 --profile CvatEnterpriseCustomer | docker login --username AWS --password-stdin 443536374637.dkr.ecr.eu-west-1.amazonaws.com
   ```

## Steps how to deploy CVAT on customer managed instance (both EC2 and non EC2)

### Customer side actions

1. Clone CVAT repo

   ```bash
   git clone https://github.com/cvat-ai/cvat.git && cd cvat
   ```

1. Place the `docker-compose.enterprise.yml` configuration file that you should recieve from CVAT team.

   Modify `docker-compose.enterprise.yml` if needed (e.g. to change default directory to store all CVAT related data).
   Please consult with CVAT team if you have any questions.

   ```yaml
   volumes:
     cvat_data:
       driver_opts:
         type: none
         device: /mnt/cvat/data
         o: bind

     cvat_db:
       driver_opts:
         type: none
         device: /mnt/cvat/db
         o: bind

     cvat_keys:
       driver_opts:
         type: none
         device: /mnt/cvat/keys
         o: bind

     cvat_logs:
       driver_opts:
         type: none
         device: /mnt/cvat/logs
         o: bind

     cvat_events:
       driver_opts:
         type: none
         device: /mnt/cvat/events
         o: bind

     cvat_cache_db:
       driver_opts:
         type: none
         device: /mnt/cvat/cache
         o: bind
   ```

1. To simplify deploying, use the following shell script. Don't forget to
change the `CVAT_HOST` variable in the file (it should be FQDN).

   ```bash
   #!/usr/bin/env bash
   set -e

   aws ecr get-login-password --region eu-west-1 --profile CvatEnterpriseCustomer | docker login --username AWS --password-stdin 443536374637.dkr.ecr.eu-west-1.amazonaws.com

   export CVAT_HOST=\<CUSTOM_DOMAIN\>
   export ACME_EMAIL=support@cvat.ai
   export CVAT_VERSION='v2.41.0'

   git fetch origin
   git checkout ${CVAT_VERSION}

   docker compose \
   -f docker-compose.yml \
   -f docker-compose.enterprise.yml \
   "$@"
   ```

1. Run cvat with the following command:

   ```bash
   ./docker-compose.sh up -d
   ```

1. Create a superuser:

   ```bash
   docker exec -it cvat_server bash -ic 'python3 ~/manage.py createsuperuser'
   ```

### CVAT side actions:

1. Provide Steps above to the customer.
1. Add to the trusted entities new item. Make sure that name of role is correct (ask customer to provide role arn).

   ```json
      {
       "Sid": "Toyota",
       "Effect": "Allow",
       "Principal": {
           "AWS": "arn:aws:iam::264357007533:role/CvatEnterpriseCustomer"
       },
       "Action": "sts:AssumeRole"
   }
   ```

1. Provide `docker-compose.enterprise.yml` file with the following content:

   ```yaml
    services:
     cvat_db:
       # The default value is 64 MB, which is insufficient for some cases and causes errors like
       # ERROR:  could not resize shared memory segment
       shm_size: 512mb

     cvat_server:
       image: cvat/server_ent:${CVAT_VERSION:-dev}
       build:
         context: ..
         args:
           CVAT_VERSION: ${CVAT_VERSION:-dev}
       environment:
         NUMPROCS: 3
       volumes:
         - ${AUTH_CONFIG_PATH:-../configs/auth_config.yml}:/home/django/auth_config.yml:ro

     cvat_worker_export:
       image: cvat/server_ent:${CVAT_VERSION:-dev}

     cvat_worker_import:
       image: cvat/server_ent:${CVAT_VERSION:-dev}

     cvat_worker_annotation:
       image: cvat/server_ent:${CVAT_VERSION:-dev}

     cvat_worker_utils:
       image: cvat/server_ent:${CVAT_VERSION:-dev}

     cvat_worker_webhooks:
       image: cvat/server_ent:${CVAT_VERSION:-dev}

     cvat_worker_quality_reports:
       image: cvat/server_ent:${CVAT_VERSION:-dev}

     cvat_worker_immediate_feedback:
       image: cvat/server_ent:${CVAT_VERSION:-dev}
       container_name: cvat_worker_immediate_feedback
       command: run worker immediate_feedback
       extends:
         file: docker-compose.yml
         service: cvat_worker_quality_reports

     cvat_worker_analytics_reports:
       image: cvat/server_ent:${CVAT_VERSION:-dev}
       container_name: cvat_worker_analytics_reports
       command: run worker analytics_reports
       environment:
         NUMPROCS: 2
       extends:
         file: docker-compose.yml
         service: cvat_worker_export # inherits    clickhouse env

     cvat_worker_chunks:
       image: cvat/server_ent:${CVAT_VERSION:-dev}

     cvat_ui:
       image: cvat/ui_ent:${CVAT_VERSION:-dev}

     cvat_pushpin:
       image: fanout/pushpin:1.40.1
       container_name: cvat_pushpin
       restart: always
       labels:
         traefik.enable: "true"
         traefik.http.services.cvat-pushpin.loadbalancer.server.port: "7999"
         traefik.http.routers.cvat-pushpin.rule:
           Host(`${CVAT_HOST:-localhost}`) &&
           (PathRegexp(`^/api/functions/\d+/run$`) || PathRegexp(`^/api/functions/queues/[\w:]+/watch$`))
         traefik.http.routers.cvat-pushpin.priority: "1000"
         traefik.http.routers.cvat-pushpin.entrypoints: web
       command:
         - sh
         - -ec
         - |
             sed -Ei \
              -e 's/^(accept_x_forwarded_protocol)=.*/\1=true/' \
              -e 's/^(x_forwarded_for)=.*/\1=append/' \
              /etc/pushpin/pushpin.conf
             exec pushpin --merge-output --route='* cvat-server:8080'
       networks:
         cvat:
           aliases:
             - cvat-pushpin

   volumes:
     cvat_data:

     cvat_db:

     cvat_keys:

     cvat_logs:

     cvat_events_db:
   ```

