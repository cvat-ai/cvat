---
title: "Access Tokens"
linkTitle: "Access Tokens"
weight: 10
description: 'Use access tokens for enhanced security when integrating with CVAT API'
---

## Overview

When interacting with the API, there are several authentication options available in CVAT:
- Basic authentication, with a username and a password
- Legacy token authentication, with an API key (deprecated)
- Session authentication, with a session ID and a CSRF token
- Personal Access Token (PAT) authentication, with an access token value

**Personal Access Token (PAT)** is an authentication option dedicated to CLI, SDK and Server API
clients. To authenticate using this method, you need an access token that can be created and
configured in the user settings section in the UI. It is the recommended authentication option
for CVAT API interaction and integrations.

Compared to the other authentication options, PATs provide a more convenient, controlled,
and secure way to authenticate requests from the CLI, scripts, and 3rd-party applications.
They improve the security of your account by allowing you to use separate credentials
for each application and by removing the need to use the password. Tokens can be created and
revoked at any time by a user request. The security is further improved
by configuring the allowed operations and setting expiration dates for each token.

{{% alert title="Warning" color="warning" %}}
Please take special care to store the tokens securely. While CVAT takes extra steps to improve
the security of the tokens, their security is primarily the user’s responsibility.
It’s recommended to configure each token to only allow the required operations and to have an
expiration date. Avoid sharing your tokens with other people. If you think a token might
have been leaked, [revoke the token](#how-to-revoke-personal-access-tokens) immediately.
{{% /alert %}}

## How to manage Personal Access Tokens

It's possible to create, edit, and revoke tokens. The tokens can be created, edited, and revoked
at any time by a user request. You can configure the name, expiration date, and permissions
for each token.

It's recommended to always specify the expiration date for tokens. Please note that unused tokens
are automatically considered “stale” and removed after some time period
of inactivity (1 year by default).

{{% alert title="Note" color="primary" %}}
When using a self-hosted version, the staleness period can be configured
via the `ACCESS_TOKEN_STALE_PERIOD` setting.
{{% /alert %}}

{{% alert title="Note" color="primary" %}}
When using a self-hosted version, the maximum number of tokens per user can be configured
via the `MAX_ACCESS_TOKENS_PER_USER` setting.
{{% /alert %}}

{{% alert title="Note" color="primary" %}}
CVAT Online users can have up to 50 Personal Access Tokens.
{{% /alert %}}

### Permissions

It's possible to configure allowed operations for a token. Currently, there is an option to
make a token read-only or read/write capable. A read-only token will only be allowed to make safe requests
that do not modify the server state.

{{% alert title="Warning" color="warning" %}}
For security reasons, token-authenticated clients are not allowed to modify tokens
and user details, regardless of the configuration.
{{% /alert %}}

### How to create a Personal Access Token

1. Open the user settings page

  ![User profile menu item](/images/user_menu_profile_nav.png)

2. Navigate to the "Security" section

  ![User profile - security tab](/images/user_page_security_nav.png)

3. Create a new token using the "+" button

  ![Access Token create button](/images/access_token_list_create_button.png)

4. Configure the name, expiration date, and permissions for the new token. Once ready, click "Save".

  ![Access Token edit dialog](/images/access_token_new_dialog.png)

5. You will be shown the new token. Make sure to **securely save** this value,
   it will not be available in CVAT after the dialog window is closed.

  ![Access Token private key dialog](/images/access_token_private_key.png)

6. Once the value is saved, close the dialog window.

The new token is ready for use.

### How to edit a Personal Access Token

1. Open the user settings page

  ![User profile menu item](/images/user_menu_profile_nav.png)

2. Navigate to the "Security" section

  ![User profile - security tab](/images/user_page_security_nav.png)

3. Click the "Edit" button for the token.

  ![Access Token edit button](/images/access_token_edit_button.png)

4. The token editing page will be displayed. Here you can configure token name,
  permissions, and expiration date.

  ![Access Token edit dialog](/images/access_token_edit_dialog.png)

5. After the required changes are made, click the "Update" button to confirm the updates.


### How to revoke Personal Access Tokens

Revocation allows you to prevent further uses of a token. Once a token is revoked, it cannot
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

## How to use Personal Access Tokens

Once you have a Personal Access Token, it can be used for authentication in CVAT.

To authenticate a server HTTP API request with a token, the `Authorization` header
must be specified. The value has to include the `Bearer` prefix:
`Authorization: Bearer token_value`.

Example: sending a request via the _requests_ Python library
```python
import requests
token = "..."
response = requests.get(
  "https://app.cvat.ai/api/tasks",
  headers={"Authorization": "Bearer " + token}
)
print(response.json()["results"])
```

Personal Access Tokens can also be used for authentication in other CVAT components:
- in the {{< ilink "/docs/api_sdk/sdk/lowlevel-api#authentication" "low-level" >}} and
  {{< ilink "/docs/api_sdk/sdk/highlevel-api#authentication" "high-level" >}} API of the CVAT SDK
- in the {{< ilink "/docs/api_sdk/cli#authentication" "CVAT CLI" >}}
