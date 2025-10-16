---
title: "Access Tokens"
linkTitle: "Access Tokens"
weight: 10
description: 'Use access tokens for enhanced security when integrating with CVAT API'
---

## Overview

When interacting with API, there are several authentication options available in CVAT:
- Basic authentication, with a username and a password
- Session authentication, with a session ID and a CSRF token
- Personal Access Token (PAT) authentication, with an access token value

Basic authentication requires a username and a password pair.
It's recommended to use other authentication options instead for better security.

Session authentication requires a Session ID and a CSRF token than can be obtained after
logging in using the configured authentication method. This option is supposed for work
in the web browser and implements standard authorization protocols, such as SSO.
It may be inconvenient, insecure or not available for use in CLI and tool integrations.
To address such use cases, there's an option to use Personal Access Token (PAT) authentication.

*Personal Access Token (PAT)* is an authentication option dedicated for CLI, SDK and Server API
users. It requires a token that can be configured in the user settings section in the UI.
It is the recommended authentication option for CVAT API interaction and integrations.

## How to manage Personal Access Tokens

It's possible to create, edit, and revoke tokens. The tokens can be created and revoked at any
time by a user request.

It's recommended to always specify the expiration date for tokens. Please note that unused tokens
are automatically removed after some time period of inactivity (1 year by default).

> When using a self-hosted version, the staleness period can be configured
> via the `ACCESS_TOKEN_STALE_PERIOD` setting.

> When using a self-hosted version, the maximum number of tokens per user can be configured
> via the `MAX_ACCESS_TOKENS_PER_USER` setting.

> app.cvat.ai: users can have up to 50 Personal Access Tokens.

### Permissions

It's possible to configure allowed operations for a token. Currently, there is an option to
make a token Read-only or Read/Write capable. A Read-only token will only be allowed safe requests
that do not modify the server state.

> For security reasons, token-authenticated clients are not allowed to modify tokens
> and user details, regardless of the configuration.

### How to create a Personal Access Token

1. Open the user settings page

  ![User profile menu item](/images/user_menu_profile_nav.png)

2. Navigate to the "Security" section

  ![User profile - security tab](/images/user_page_security_nav.png)

3. Create a new token using the "+" button

  ![Access Token create button](/images/access_token_list_create_button.png)

4. Configure the name, expiration date, and permissions for the new token. Once ready, click "Save".

  ![Access Token edit dialog](/images/access_token_new_dialog.png)

5. You will be shown the private key of the new token. Make sure to securely safe this value,
   it will not be available in CVAT after the dialog window is closed.

  ![Access Token private key dialog](/images/access_token_private_key.png)

6. Once the value is saved, close the dialog window.

The new token is ready for use.

### How to revoke Personal Access Tokens

Revocation allows you to disallow further uses for a token. Once a token is revoked, it cannot
be restored.

1. Open the user settings page

  ![User profile menu item](/images/user_menu_profile_nav.png)

2. Navigate to the "Security" section

  ![User profile - security tab](/images/user_page_security_nav.png)

3. Click the "Revoke" button for the token.

  ![Access Token revoke button](/images/access_token_revoke_button.png)

4. Confirm revocation in the dialog

  ![Access Token revoke dialog](/images/access_token_revoke_dialog.png)

The token will not be available for use anymore.
