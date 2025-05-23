---
title: 'SSO configuration'
linkTitle: 'SSO configuration'
weight: 3
description: 'SSO for a Self-Hosted solution'
---

> **Note:** This is a paid feature available only for the [Enterprise clients](https://www.cvat.ai/pricing/on-prem).

CVAT supports authentication through both OpenID Connect (OIDC) and Security Assertion Markup Language (SAML) protocols.
To configure SSO, complete the following 2 main steps:
1. Configure the Identity Provider (IdP) — set up an application on your IdP platform.
1. Update the CVAT configuration — provide the necessary identity provider settings in the CVAT configuration file.

Choose your provider and follow the detailed setup instructions:
- [Microsoft Entra ID](#microsoft-entra-id)
- [Okta](#okta)
- [Auth0](#auth0)
- [keycloak](#keycloak)

## Configuring SSO in CVAT

CVAT supports integration with external Identity Providers (IdPs) using a dedicated configuration file.
This file allows you to define how users are authenticated and which providers are available for login.

### Identity Provider Selection

In some cases, it's necessary to determine which IdP should be used for authenticating a given user.
CVAT provides a `selection_mode` setting for this purpose. There are 2 available modes:
- `email_address` (default): Selects the IdP based on the domain of the user’s email address.
- `lowest_weight`: Automatically selects the IdP with the lowest assigned weight.

### IdP Configuration Structure

To integrate an Identity Provider, you must define its configuration block under the `identity_providers` section
in the CVAT config file. Each provider's configuration includes both general and protocol-specific settings.

| Key            | Required   | Description |
| -------------- | ---------- | ----------- |
| `id`           | *required* | A unique, URL-safe identifier for the IdP. Used in callback URLs. |
| `name`         | *required* | A human-readable name for the IdP. |
| `protocol`     | *required* | Authentication protocol (`OIDC`/`SAML`). |
| `email_domain` | *optional* | Company email domain (used with `email_address` selection mode). |
| `weight`       | *optional* | Determines priority (used with `lowest_weight` selection mode). Default is 10. |

Additionally, each IdP configuration must include several protocol-specific parameters:
{{< tabpane text=true >}}
  {{% tab header="OpenID Connect" %}}
  - `client_id` and `client_secret` (*required*) - these values can be obtained from the configuration page of the specific provider.
  - `server_url` (*required*): URL is used to obtain IdP OpenID Configuration Metadata.
    __NOTE__: How to check `server_url` correctness: server_url + `/.well-known/openid-configuration` API should exist
    and return [OpenID Provider Metadata](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata).
    Generally, each authentication platform provides a list of all endpoints. Need to find the corresponding endpoint
    and select the part in front of `/.well-known/openid-configuration`. For example, in the case of integrating
    an OIDC Microsoft Entry ID application, don't forget to specify the second version of API
    (`https://login.microsoftonline.com/<tenant_id>/v2.0`).
  - `token_auth_method` (*optional*) - token endpoint authentication method which can be one of
    `client_secret_basic`, `client_secret_post`. If this field is omitted, a method from
    the server's token auth methods list will be used.

  __NOTE__: There is a global setting that applies to all configured OIDC-based Identity Providers: `enable_pkce`. This option controls whether `Proof Key for Code Exchange` (PKCE) is enabled for the authentication flow.
  ```yaml
  ---
  sso:
  enable_pkce: true
  ...
  ```
  {{% /tab %}}
  {{% tab header="SAML" %}}
   - `entity_id` (*required*) - IdP entity ID, should be equal to the corresponding setting on the IdP configuration page.
   - `metadata_url` (*optional*) - SAML metadata URL. This can typically be found on the IdP configuration page.
   - `x509_cert` (*optional*) - The SAML X.509 certificate. Also could be found in the IdP’s configuration.
     __NOTE__: If the `metadata_url` is not specified, this parameter becomes **required**.
   - `sso_url` (*optional*) - SAML endpoint for the Single Sign-On service. Also could be found in the IdP’s configuration.
     __NOTE__: If the `metadata_url` is not specified, this parameter becomes **required**.
   - `attribute_mapping` (*required*) - A mapping for users' attributes.
  {{% /tab %}}
{{< /tabpane >}}

Below are simple examples of SSO configuration file for both protocols:
{{< tabpane text=true >}}
  {{% tab header="Integrate OIDC-based IdP" %}}
   ```yaml
   ---
   sso:
   enabled: true
   selection_mode: email_address
   identity_providers:
    - id: oidc-idp
      protocol: OIDC
      name: Example OIDC-based IdP
      server_url: https://example.com
      client_id: xxx
      client_secret: xxx
      email_domain: example.com
   ```
  {{% /tab %}}
  {{% tab header="Integrate SAML-based IdP" %}}
  ```yaml
   ---
   sso:
   enabled: true
   selection_mode: email_address
   identity_providers:
    - id: saml-idp
      protocol: SAML
      name: Example SMAL-based IdP
      entity_id: <idp-entity-id>
      email_domain: example.com
      metadata_url: http://example.com/path/to/saml/metadata/

      attribute_mapping:
        uid: ...
        email_verified: ...
        email: ...
        last_name: ...
        first_name: ...
        username: ...
   ```
  {{% /tab %}}
{{< /tabpane >}}

Once the configuration file is updated, several environment variables must be exported before running CVAT:
```bash
export AUTH_CONFIG_PATH="<path_to_auth_config>"
export CVAT_HOST="<cvat_host>"
# cvat_port is optional
export CVAT_BASE_URL="<http|https>://${CVAT_HOST}:<cvat_port>"
```

Start the CVAT enterprise instance as usual.
That's it! On the CVAT login page, you should now see the option `Continue with SSO`.
![](/images/sso_enabled.png)

More information about OIDC-based and SAML-based IdP configuration expected by Django Allauth can be found [here](https://docs.allauth.org/en/latest/socialaccount/providers/openid_connect.html) and [here](https://docs.allauth.org/en/latest/socialaccount/providers/saml.html) respectively.


## Platform specific IdP configuration
### Microsoft Entra ID

#### OpenId Connect
Follow these steps to configure an application on the `Azure` platform:

// TODO: add note about `azure-oidc`

##### **Step 1: Register an OIDC-based Application**

To start, log into your [Microsoft Azure Portal](https://portal.azure.com/#home). Once you're in:
1. Navigate to the  `Microsoft Entra ID` service -> `App registrations` section in the menu on the left.
1. Clink on the `+ New registration` button.
1. Enter application name
1. Select `Supported account types` based on your needs
1. Add `Redirect URI`: choose `Web` platform and set `<schema:cvat_domain>/api/auth/oidc/azure-oidc/login/callback/` to the value field
1. Click on the`Register` button

// screenshot here


{{% alert title="Note" color="primary" %}}
More information on how to configure an OIDC-based application on the Azure platform can be
found [here]().
{{% /alert %}}

You’ve now created an app, but one more step is needed to finalize the configuration.

##### **Step 2: Configure credentials**

1. Navigate to the `Overview` tab of your newly created application.
1. In the `Client credentials` section, click the `Add a certificate or secret` link. This will take you to the `Certificates & secrets` page.
1. Click `+ New client secret`.
1. In the popup form, enter a description and select an expiration period, then click `Add`.

The newly created secret will appear in the list.
Make sure to copy the value now — you won’t be able to see it again later.

// screenshots here

##### **Step 3: Configure CVAT**

Utilize the example below as a template for your configuration:

```yaml
sso:
  enabled: true
  selection_mode: email_address
  identity_providers:
   - id: azure-oidc
    protocol: OIDC
    name: Azure OIDC-based IdP
    server_url: https://<Directory (tenant) ID>/v2.0/
    client_id: <Secret ID>
    client_secret: <Secret Value>
    email_domain: <company_email_domain>
```

{{< alert title="Tip" >}}
Actual `Secret ID` and `Secret Value` values may be found on `Certificates & secrets` tab of the application,
while `Directory (tenant) ID` - on the `Overview` tab.
{{< /alert >}}

After running CVAT with updated config file, users will be able to authenticate using configured Identity Provider.

#### SAML

// TODO: add note about `azure-saml`
Follow these steps to configure an application on the `Azure` platform:

##### **Step 1: Register an SAML-based Application**

To start, log into your [Microsoft Azure Portal](https://portal.azure.com/#home). Once you're in:
1. Navigate to the  `Microsoft Entra ID` service -> `Enterprise applications` section in the menu on the left.
1. Click `+ New application` and enter a name for the application in the popup window, then click `Create`.
   // screenshot here

You’ve now created an app, but a few more steps are needed to finalize the configuration.

##### **Step 2: Configure an created application**

1. Navigate to the `Single sign-on` section in the menu on the left
1. Choose the SAML protocol as the single sign on method
   // screenshot here
1. Edit `Basic SAML Configuration`:
   - `Identifier (Entity ID)`: `<schema:cvat_domain>/api/auth/saml/azure-saml/metadata/`
   - `Reply URL (Assertion Consumer Service URL)`: `<schema:cvat_domain>/api/auth/saml/azure-saml/acs/`
   - Save changes
1. Edit `Attributes & Claims`
   1. Add a new `uid` claim:
      - Name: `uid`
      - Namespace: `http://schemas.xmlsoap.org/ws/2005/05/identity/claims`
      - Source: `attribute`
      - Source attribute: `user.objectid`

{{% alert title="Note" color="primary" %}}
More information on how to configure an application on Azure platform can be
found [here]().
{{% /alert %}}


##### **Step 3: Assign users and groups**

At this point, no users or groups have been assigned to the application.
To grant access:
1. Navigate to the `Users and groups` section of the application.
1. Click the `+ Add user/group` button.
1. Select the users or groups you want to assign.
1. Confirm selection.

The selected users or groups will now appear in the assignment list.
// screenshot here

That's it, now we can move on to the configuration in CVAT.

##### **Step 4: configure CVAT**

Utilize the example below as a template for your configuration:

```yaml
sso:
  enabled: true
  selection_mode: email_address
  identity_providers:
  - id: azure-saml
    protocol: SAML
    name: Azure SAML-based IdP
    entity_id: <Microsoft Entra Identifier> (https://sts.windows.net/<tenantId>/)
    metadata_url: <App Federation Metadata Url>

    attribute_mapping:
      uid: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/uid
      username: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier
      email: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress
      first_name: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname
      last_name: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname
      # email_verified: it is not possible to configure SAML-based application to send this claim to the SP

    email_domain: <company_email_domain>

```
{{< alert title="Tip" >}}
Actual `Microsoft Entra Identifier` and `App Federation Metadata Url` values may be found on the `Single sign-on` tab of the created application
{{< /alert >}}

// screenshot here

After running CVAT with updated config file, users will be able to authenticate using configured Identity Provider.

### Okta
#### OpenId Connect
Follow these steps to configure an application on the `Okta` platform:

// TODO: add note about `okta-oidc`

##### **Step 1: Register an OIDC-based Application**

To start, log into your [Okta admin dashboard](https://login.okta.com/). Once you're in:
1. Navigate to the `Applications` section in the menu on the left.
1. Clink on the `Create App integration` button.
1. Select `OIDC - OpenID Connect` as a sign-in method and `Web Application` type.
  // okta_oidc_1 screenshot here
1. Fill the form with the following content:
  - `App integration name`: enter a name for the application
  - `Sign-in redirect URIs`: `<schema:cvat_domain>/api/auth/oidc/okta-oidc/login/callback/`
  - Select option in the `Controlled access` to match your requirements. In this example we'll use `Skip group assignment for now`.

{{% alert title="Note" color="primary" %}}
More information on how to configure an OIDC-based application on the Okta platform can be
found [here](https://help.okta.com/en-us/content/topics/apps/apps_app_integration_wizard_oidc.htm).
{{% /alert %}}

You’ve now created an app, but one more step is needed to finalize the configuration.

##### **Step 2: Assign users or groups**

At this point, no users or groups have been assigned to the application.
To grant access:
1. Navigate to the `Assignments` tab of the application.
1. Click the `Assign` button and select `Assign to People` or `Assign to Groups` based on your needs.
1. Identify the users or groups you want to assign, then click `assign`.

The selected users or groups will now appear in the assignment list.
// screenshot here

##### **Step 3: Configure CVAT**

Utilize the example below as a template for your configuration:

```yaml
sso:
  enabled: true
  selection_mode: email_address
  identity_providers:
   - id: okta-oidc
    protocol: OIDC
    name: Okta OIDC-based IdP
    server_url: https://<okta_domain>/
    client_id: <client_id>
    client_secret: <client_secret>
    email_domain: <company_email_domain>
```

{{< alert title="Tip" >}}
Actual `Client ID` and `Client secret` key values may be found on the `General` tab of the created application
{{< /alert >}}

After running CVAT with updated config file, users will be able to authenticate using configured Identity Provider.

#### SAML
Follow these steps to configure an application on the `Okta` platform:

// TODO: add note about `okta-saml`

##### **Step 1: Register an SAML-based Application**

To start, log into your [Okta admin dashboard](https://login.okta.com/). Once you're in:
1. Navigate to the `Applications` section in the menu on the left.
1. Clink on the `Create App integration` button.
1. Select `SAML 2.0` as a sign-in method, then click `Next`.
1. Fill the form with general setting and go to the next configuration step.
1. On the `Configure SAML` form set the following fields:
   - `Single sign-on URL`: <schema:cvat_domain>/api/auth/saml/okta-saml/acs/
   - `Audience URI (SP Entity ID`: <schema:cvat_domain>/api/auth/saml/okta-saml/metadata/
1. Define attribute statements that will be shared with CVAT.
  In our example we will use the `Basic` attribute name format and set the mapping as showed below:
   - `firstName`: `user.firstName`
   - `lastName`: `user.lastName`
   - `username`: `user.login`
   - `email`: `user.email`
   - `uid`: `user.getInternalProperty("id")`
  // screenshot here
  {{% alert title="Tip" %}}
  If attribute mapping needs to be adapted, follow the official [documentation](https://help.okta.com/oie/en-us/content/topics/apps/define-attribute-statements.htm) on how to configure `Attribute Statements`
  {{% /alert %}}
1. Navigate to the next configuration step and fill the `Feedback` form.

You’ve now created an app, but a few more steps are needed to finalize the configuration.

##### **Step 2: Simplify login process**

If CVAT is configured to require email verification, it expects the Identity Provider to include the `email_verified` claim.
However, Okta does not send this claim by default. As a result, users will receive a confirmation email with a verification link.

There is an option to include email verification claim on sign-in step:
1. Add one more mapping `emailVerified` -> `user.emailVerified` on SAML-based application configuration step:
   1. Navigate to the `SAML Settings` on the `General` tab and click `Edit`
   1. Add one more attribute mapping as it was describe on app configuration step
1. Add custom user attribute `emailVerified`:
   - Navigate to the `Directory` section in the menu on the left -> `Profile Editor` item
   - Select default user profile from the list (`User (default)`)
   - Click `+ Add Attribute`
   - Fill out the form with your desired values, making sure to select the `boolean` data type
   - Click `Save`
1. Update people profiles:
   - Navigate to the `People` section in the menu on the left
   - Set the value for the recently created attribute for each person

##### **Step 3: Configure CVAT**

Utilize the example below as a template for your configuration:

```yaml
sso:
  enabled: true
  selection_mode: email_address
  identity_providers:
  - id: okta-saml
    protocol: SAML
    name: Okta SAML-based Identity Provider
    entity_id: <Issuer>
    metadata_url: <Metadata URL>

    attribute_mapping:
      uid: uid
      username: username
      email: email
      first_name: firstName
      last_name: lastName
      email_verified: emailVerified # if configured

    email_domain: <company_email_domain>
```

{{< alert title="Tip" >}}
`Metadata URL` and `Issuer` values may be found on the `Sign On` tab of the application setting
{{< /alert >}}

After running CVAT with updated config file, users will be able to authenticate using configured Identity Provider.

### Auth0
#### OpenID connect

Follow these steps to configure an application in the `Auth0` platform:

##### **Step 1: Register an OIDC-based Application**

To start, log into your [Auth0 dashboard](https://manage.auth0.com/dashboard). Once you're in:

1. Navigate to the `Applications` section in the menu on the left, click `+ Create Application`.
1. Enter a name for the application and choose the `Regular Web Applications` type, then click `Create`.

You’ve now created an app, but a one more step is needed to finalize the configuration.

##### **Step 2: Configure an created application**

1. In the `Settings` tab of your new application, scroll down to the `Application URIs` section.
1. Add `<schema:cvat_domain>/api/auth/oidc/auth0-oidc/login/callback/` to the `Allowed Callback URLs`.
1. Save changes.

That's it, now we can move on to the configuration in CVAT.

##### **Step 3: Configure CVAT**

Utilize the example below as a template for your configuration:

```yaml
sso:
  enabled: true
  selection_mode: email_address
  identity_providers:
   - id: auth0-oidc
    protocol: OIDC
    name: Auth0 OIDC-based IdP
    server_url: https://<auth0_domain>/
    client_id: <client_id>
    client_secret: <client_secret>
    email_domain: <company_email_domain>
```


{{< alert title="Tip" >}}
`Client ID`, `Client Secret` and `Domain` can be found in the `Basic Information` section of application settings
{{< /alert >}}
// screenwhot here

After running CVAT with updated config file, users will be able to authenticate using configured Identity Provider.

#### SAML

// TODO: add note about `auth0-saml`
Follow these steps to configure an application in the `Auth0` platform:

##### **Step 1: Register an SAML-based Application**

To start, log into your [Auth0 dashboard](https://manage.auth0.com/dashboard). Once you're in:

1. Navigate to the `Applications` section in the menu on the left, click `+ Create Application`.
1. Enter a name for the application and choose the `Regular Web Applications` type, then click `Create`.

You’ve now created an app, but a few more steps are needed to finalize the configuration.

##### **Step 2: Configure an created application**

{{% alert title="Note" color="primary" %}}
More information on how to configure an application on Auth0 platform can be
found [here](https://auth0.com/docs/authenticate/single-sign-on/outbound-single-sign-on/configure-auth0-saml-identity-provider#configure-saml-sso-in-auth0).
{{% /alert %}}

1. Navigate to the `Addons` tab of the created application and click on the `SAML2 WEB APP` button.
1. Navigate to the `Settings` tab in the popup window
1. Set the `Application Callback URL` to `<schema:cvat_domain>/api/auth/saml/auth0-saml/acs/`
1. Then, in the `Settings` field, enter a JSON object like the following:
  ```json
  {
    "audience": "<schema:cvat_domain>/api/auth/saml/auth0-saml/metadata/",
    "recipient": "<schema:cvat_domain>/api/auth/saml/auth0-saml/acs/",
    "destination": "<schema:cvat_domain>/api/auth/saml/auth0-saml/acs/",
    "mappings": {
      "user_id": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
      "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      "nickname": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/username",
      "given_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
      "family_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
      "email_verified": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailverified"
    },
    "createUpnClaim": false,
    "passthroughClaimsWithNoMapping": false,
    "mapIdentities": false
  }
  ```
1. Scroll down and click `Enable`

That's it, now we can move on to the configuration in CVAT.

##### **Step 3: configure CVAT**

Utilize the example below as a template for your configuration:

```yaml
sso:
  enabled: true
  selection_mode: email_address
  identity_providers:
  - id: auth0-saml
    protocol: SAML
    name: Auth0 SAML-based IdP
    entity_id: <Issuer>
    metadata_url: <Metadata URL>

    attribute_mapping:
      uid: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier
      username: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/username
      email: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress
      first_name: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname
      last_name: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname
      email_verified: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailverified

    email_domain: <company_email_domain>

```
{{< alert title="Tip" >}}
Actual `Metadata URL` and `Issuer` values may be found on the `Usage` tab of the `SAML2 Web App` plugin
{{< /alert >}}

// screenshot here

After running CVAT with updated config file, users will be able to authenticate using configured Identity Provider.


### Keycloak

To configure SSO with Keycloak in terms of Keycloak we need to create a `client`.

#### OpenID Connect
Follow these steps to do that:

##### **Step 1: Register an OIDC-based Client**

To start, go to the Keycloak service (by default it is listening for http and https requests
using the ports 8080 and 8443, respectively) and log into your account. Once you're in:

1. Under desired `realm` navigate to the `Clients` section and click `create client`.
1. Fill out the general client settings:
   - `Client type`: OpenID Connect
   - `Client ID`: enter client identifier, in this example it is `keycloak-oidc`
   - Enter a name for the client, e.g. OIDC client
   // ![](/images/keycloak_oidc_1.png)
1. On the next step enable the `Client authentication` toggle.
   // ![](/images/keycloak_oidc_2.png)
1. In the `Login settings` section, provide the following values:
   - `Home URL`: <schema:cvat_domain>
   - `Valid redirect URIs`: <schema:cvat_domain>/api/auth/oidc/keycloak-oidc/login/callback/
   // ![](/images/keycloak_oidc_3.png)

That's it, now we can move on to the configuration in CVAT.

##### **Step 2: Configure CVAT**

Utilize the example below as a template for your configuration:

```yaml
sso:
  enabled: true
  selection_mode: email_address
  identity_providers:
    - id: keycloak-oidc
      protocol: OIDC
      name: Keycloak OIDC-based Identity Provider
      server_url: <schema:keycloak_domain>/realms/<custom_realm>/.well-known/openid-configuration
      client_id: <Client ID>
      client_secret: <Client Secret>
      email_domain: <company_email_domain>
```

{{< alert title="Tip" >}}
Actual `Client Secret`value can be found on the `Credentials` tab of the created OIDC client
{{< /alert >}}
// screenshot here
After running CVAT with updated config file, users will be able to authenticate using configured Identity Provider.

#### SAML

// TODO: add note about `keycloak-saml`
Follow these steps to configure a client:

##### **Step 1: Register a SAML-based Client**

To start, go to the Keycloak service (by default it is listening for http and https requests
using the ports 8080 and 8443, respectively) and log into your account. Once you're in:

1. Under desired `realm` navigate to the `Clients` section and click `create client`.
1. Fill out the general client settings:
   - `Client type`: SAML
   - Set the `Clint ID` the URL: `<schema:cvat_domain>/api/auth/saml/keycloak-saml/metadata/`
   - Enter a name for the client, e.g. SAML client
1. n the `Login settings` section, provide the following values:
   - `Home  URL`: <schema:cvat_domain>
   - `Valid redirect URIs`: <schema:cvat_domain>/api/auth/saml/keycloak-saml/acs/
   // TODO: - `Master SAML Processing URL`: <schema:cvat_domain>/api/auth/saml/keycloak-saml/acs/

You’ve now created an app, but a few more steps are needed to finalize the configuration.

##### **Step 2: Configure a created client**

{{% alert title="Note" color="primary" %}}
More information on how to configure a client in Keycloak can be
found [here]().
{{% /alert %}}

1. Navigate to the general settings of the created client, scroll down to the `SAML capabilities` section.
1. Update the following parameters:
   - `Name ID format`: email (TODO: probably need to keep it undefined, other providers work)
   - `Force name ID format`: `On`
1. Navigate to the `Keys` tab and enable the `Client signature required` toggle.
1. Configure attributes & claims:
   1. Navigate to the `Client scopes` tab on the created client -> dedicated scopes for the client.
      You will see that there is no configured mappers.
      // screenshot here
   1. Set up mappers for the following attributes:
      - uid
      - first_name
      - last_name
      - username
      - email
      // screenshot here with all mappers configured
      For attributes like `email`, `first name`, and `last name`, you can either
         - Use the predefined mappers, or
         // screenshot here
         - Follow the manual configuration steps to create them yourself.
      To configure other mappers click `Configure a new mapper` if it is a first mapper or `Add mapper` -> `By configuration` and then select `User Property`.
      For instance, to configure a mapper for the `username` attribute, fill in the form as it is done below:
        - `Name`: username
        - `Property`: username
        - `SAML Attribute Name`: usernameAttribute
        // screenshot here

That's it, now we can move on to the configuration in CVAT.

##### **Step 3: configure CVAT**

Utilize the example below as a template for your configuration:

```yaml
sso:
  enabled: true
  selection_mode: email_address
  identity_providers:
    - id: keycloak-saml
      protocol: SAML
      name: Keycloak SAML-based Identity Provider
      entity_id: <schema:keycloak_domain>/realms/<custom_realm>
      metadata_url: <schema:keycloak_domain>/realms/<custom_realm>/protocol/saml/descriptor

      attribute_mapping:
        uid: uidAttribute
        email_verified: emailVerifiedAttribute
        email: emailAttribute
        last_name: lastNameAttribute
        first_name: firstNameAttribute
        username: usernameAttribute

      email_domain: <company_email_domain>
```
{{< alert title="Tip" >}}
`Metadata URL`: could be found in the `Realm settings` on the `General` tab
{{< /alert >}}
// screenshot here
After running CVAT with updated config file, users will be able to authenticate using configured Identity Provider.
