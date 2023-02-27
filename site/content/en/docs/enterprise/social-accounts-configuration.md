---
title: 'Social auth configuration'
linkTitle: 'Social auth configuration'
weight: 3
description: 'Social accounts authentication for Self-Hosted solution'
---

> **Note:** This is a paid feature available for [Enterprise clients](https://www.cvat.ai/pricing/on-prem).

You can now easily set up authentication with popular social services, which opens doors to
such benefits as:

- Convenience: you can use the existing social service credentials to sign in to CVAT.
- Time-saving: with just two clicks, you can sign in without the hassle of typing in сredentials, saving time and effort.
- Security: social auth service providers have high-level security measures in place to protect your accounts.

Currently, we offer three options:

- Authentication with Github.
- Authentication with Google.
- Authentication with Amazon Cognito.

With more to come soon. Stay tuned!

See:

- [Enable authentication with a Google account](#enable-authentication-with-a-google-account)
- [Enable authentication with a GitHub account](#enable-authentication-with-a-github-account)
- [Enable authentication with an Amazon Cognito](#enable-authentication-with-an-amazon-cognito)
- [Social Auth with Django](#social-auth-with-django)

## Enable authentication with a Google account

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
   to authorized JS origins and `https://localhost:8080/api/auth/google/login/callback/` to redirect URIs.
   <br>Please make sure this URL matches `GOOGLE_CALLBACK_URL` settings variable on the server.

8. Set environment variables in CVAT:

   1. Create `docker-compose.override.yml` with the following code:

   ```yaml
   services:
     cvat_server:
       environment:
         USE_ALLAUTH_SOCIAL_ACCOUNTS: 'True'
         SOCIAL_AUTH_GOOGLE_CLIENT_ID: '<YOUR_GOOGLE_CLIENT_ID>'
         SOCIAL_AUTH_GOOGLE_CLIENT_SECRET: '<YOUR_GOOGLE_CLIENT_SECRET>'
   ```

   2. In a terminal, run the following command:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.override.yml up -d --build
   ```

## Enable authentication with a GitHub account

There are 2 basic steps to enable GitHub account authentication.

1. Open the GitHub settings page.
2. On the left menu, click **<> Developer settings** > **OAuth Apps** > **Register new application**.
   <br>For more information, see [Creating an OAuth App](https://docs.github.com/en/developers/apps/building-oauth-apps/creating-an-oauth-app)
3. Fill in the name field, set the homepage URL (for example: `https://localhost:8080`),
   and authorization callback URL (for example: `https://localhost:8080/api/auth/github/login/callback/`).
   <br>Please make sure this URL matches `GITHUB_CALLBACK_URL` settings variable on the server.
4. Set environment variables in CVAT:

   1. Create `docker-compose.override.yml` with the following code:

   ```yaml
   services:
     cvat_server:
       environment:
         USE_ALLAUTH_SOCIAL_ACCOUNTS: 'True'
         SOCIAL_AUTH_GITHUB_CLIENT_ID: '<YOUR_GITHUB_CLIENT_ID>'
         SOCIAL_AUTH_GITHUB_CLIENT_SECRET: '<YOUR_GITHUB_CLIENT_SECRET>'
   ```

   2. In a terminal, run the following command:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.override.yml up -d --build
   ```

> **Note:** You can also configure [GitHub App](https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app),
> but don't forget to add required permissions.
> <br>In the **Permission** > **Account permissions** > **Email addresses** must be set to **read-only**.

## Enable authentication with an Amazon Cognito

To enable authentication, do the following:

1. Create a user pool. For more information,
   see [Amazon Cognito user pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)

2. Set environment variables in CVAT:

   1. Create `docker-compose.override.yml` with the following code:

<!--lint disable maximum-line-length-->
   ```yaml
   services:
     cvat_server:
       environment:
         SOCIAL_AUTH_AMAZON_COGNITO_DOMAIN: 'https://<domain-prefix>.auth.us-east-1.amazoncognito.com'
         SOCIAL_AUTH_AMAZON_COGNITO_CLIENT_ID: '<YOUR_AMAZON_COGNITO_CLIENT_ID>'
         SOCIAL_AUTH_AMAZON_COGNITO_CLIENT_SECRET: '<YOUR_AMAZON_COGNITO_CLIENT_SECRET>'
   ```

<!--lint enable maximum-line-length-->

   2. In a terminal, run the following command:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.override.yml up -d --build
   ```

## Social Auth with Django

You can also configure OAuth with other services,
see [Social Auth with Django services](https://django-allauth.readthedocs.io/en/latest/providers.html)
