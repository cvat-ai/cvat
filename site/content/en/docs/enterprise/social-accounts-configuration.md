---
title: 'Social auth configuration'
linkTitle: 'Social auth configuration'
weight: 3
description: 'Social accounts authentication for a Self-Hosted solution'
---

> **Note:** This is a paid feature available for [Enterprise clients](https://www.cvat.ai/pricing/on-prem).

You can now easily set up authentication with popular social services, which opens doors to
such benefits as:

- Convenience: you can use the existing
  social service credentials to sign in to CVAT.
- Time-saving: with just two clicks, you can
  sign in without the hassle of typing in сredentials, saving time and effort.
- Security: social auth service providers have
  high-level security measures in place to protect your accounts.

Currently, we offer three options:

- [Authentication with Google](#authentication-with-google)
- [Authentication with GitHub](#authentication-with-github)
- [Authentication with Amazon Cognito](#authentication-with-amazon-cognito)

With more to come soon. Stay tuned!

## Authentication with Google

To enable authentication, do the following:

1. Log in to the [Google Cloud console](https://console.cloud.google.com/)
2. [Create a project](https://cloud.google.com/resource-manager/docs/creating-managing-projects),
   and go to [APIs & Services](https://console.cloud.google.com/apis/)
3. On the left menu, select **OAuth consent**, then select
   **User type** (**Internal** or **External**), and click **Create**.
4. On the **OAuth consent screen** fill all required fields, and click **Save and Continue**.
5. On the **Scopes** screen, click **Add or remove scopes** and
   select `auth/userinfo.email`, `auth/userinfo.profile`, and `openid`.
   Click **Update**, and **Save and Continue**.
   <br>For more information, see [Configure Auth Consent](https://developers.google.com/workspace/guides/configure-oauth-consent).
6. On the left menu, click **Credentials**, on the top
   menu click **+ Create credentials**, and select **OAuth client ID**.
7. From the **Application Type** select **Web application** and
   configure: **Application name**, **Authorized JavaScript origins**, **Authorized redirect URIs**.
   <br> For example, if you plan to deploy CVAT instance on `https://localhost:8080`, add `https://localhost:8080`
   to authorized JS origins and `https://localhost:8080/api/auth/social/goolge/login/callback/` to redirect URIs.
8. Create configuration file in CVAT:

   1. Create the `auth_config.yml` file with the following content:

   ```yaml
   ---
   social_account:
     enabled: true
     google:
       client_id: <some_client_id>
       client_secret: <some_client_secret>
   ```

   2. Set `AUTH_CONFIG_PATH="<path_to_auth_config>` environment variable.

9. In a terminal, run the following command:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.override.yml up -d --build
   ```

## Authentication with GitHub

There are 2 basic steps to enable GitHub account authentication.

1. Open the GitHub settings page.
2. On the left menu, click **<> Developer settings** > **OAuth Apps** > **Register new application**.
   <br>For more information, see [Creating an OAuth App](https://docs.github.com/en/developers/apps/building-oauth-apps/creating-an-oauth-app)
3. Fill in the name field, set the homepage URL (for example: `https://localhost:8080`),
   and authentication callback URL (for example: `https://localhost:8080/api/auth/social/github/login/callback/`).
4. Create configuration file in CVAT:

   1. Create the `auth_config.yml` file with the following content:

   ```yaml
   ---
   social_account:
     enabled: true
     github:
       client_id: <some_client_id>
       client_secret: <some_client_secret>
   ```

   2. Set `AUTH_CONFIG_PATH="<path_to_auth_config>` environment variable.

5. In a terminal, run the following command:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.override.yml up -d --build
   ```

> **Note:** You can also configure [GitHub App](https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app),
> but don't forget to add required permissions.
> <br>In the **Permission** > **Account permissions** > **Email addresses** must be set to **read-only**.

## Authentication with Amazon Cognito

To enable authentication with Amazon Cognito for your CVAT instance, follow these steps:

1. Create an **[Amazon Cognito pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)**
   (_Optional_)
1. Set up a new app client
1. Configure social authentication in CVAT

Now, let’s dive deeper into how to accomplish these steps.

### Amazon Cognito pool creation

This step is optional and should only be performed if a user pool has not already been created.
To create a user pool, follow these instructions:
1. Go to the [AWS Management Console](https://console.aws.amazon.com/console/home)
1. Locate `Cognito` in the list of services
1. Click `Create user pool`
1. Fill in the required fields

### App client creation

To create a new app client, follow these steps:
1. Go to the details page of the created user pool
1. Find the `App clients` item in the menu on the left
1. Click `Create app client`
1. Fill out the form as shown bellow:
   ![](/images/cognito_pool_1.png)
   - `Application type`: `Traditional web application`
   - `Application name`: Specify a desired name, or leave the autogenerated one
   - `Return URL` (_optional_): Specify the CVAT redirect URL
     (`<http|https>://<cvat_domain>/api/auth/social/amazon-cognito/login/callback/`).
     This setting can also be updated or specified later after the app client is created.
1. Navigate to the `Login pages` tab of the created app client
1. Check the parameters in the `Managed login pages configuration` section and edit them if needed:
   ![](/images/cognito_pool_2.png)
   - `Allowed callback URLs`: Must be set to the CVAT redirect URL
   - `Identity providers`: Must be specified
   - `OAuth grant types`: The `Authorization code grant` must be selected
   - `OpenID Connect scopes`: `OpenID`, `Profile`, `Email` scopes must be selected

### Setting up social authentication in CVAT

To configure social authentication in CVAT, create a configuration file
(`auth_config.yml`) with the following content:
  ```yaml
  ---
  social_account:
    enabled: true
    amazon_cognito:
      client_id: <client_id>
      client_secret: <client_secret>
      domain: <custom-domain> or
        https://<custom-cognito-prefix>.auth.us-east-1.amazoncognito.com
  ```
To find the `client_id` and `client_secret` values, navigate to the created app client page
and check the `App client information` section. To find `domain`, look for the `Domain` item in the list on the left.

Once the configuration file is updated, several environment variables must be exported before running CVAT:
  ```bash
  export AUTH_CONFIG_PATH="<path_to_auth_config>"
  export CVAT_HOST="<cvat_host>"
  # cvat_port is optional
  export CVAT_BASE_URL="<http|https>://${CVAT_HOST}:<cvat_port>"
  ```

Start the CVAT enterprise instance as usual.
That's it! On the CVAT login page, you should now see the option `Continue with Amazon Cognito`.
![](/images/login_page_with_amazon_cognito.png)
