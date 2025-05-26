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

If the application is already configured, refer to the [Configuring SSO in CVAT](#configuring-sso-in-cvat) section.
Otherwise, you may follow one of the detailed platform-specific guides to set up such an application:
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
| `id`           | _required_ | A unique, URL-safe identifier for the IdP. Used in callback URLs. |
| `name`         | _required_ | A human-readable name for the IdP. |
| `protocol`     | _required_ | Authentication protocol (`OIDC`/`SAML`). |
| `email_domain` | _optional_ | Company email domain (used with `email_address` selection mode). |
| `weight`       | _optional_ | Determines priority (used with `lowest_weight` selection mode). Default is 10. |

Additionally, each IdP configuration must include several protocol-specific parameters:
{{< tabpane text=true >}}
{{% tab header="OpenID Connect" %}}
- `client_id` and `client_secret` (_required_) - these values can be obtained
  from the configuration page of the specific provider.
- `server_url` (_required_): URL is used to obtain IdP OpenID Configuration Metadata.

  **NOTE**: How to check `server_url` correctness: server_url + `/.well-known/openid-configuration` API should exist
  and return [OpenID Provider Metadata](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata).
  Generally, each authentication platform provides a list of all endpoints. Need to find the corresponding endpoint
  and select the part in front of `/.well-known/openid-configuration`. For example, in the case of integrating
  an OIDC Microsoft Entry ID application, don't forget to specify the second version of API
  (`https://login.microsoftonline.com/<tenant_id>/v2.0`).
- `token_auth_method` (_optional_) - token endpoint authentication method which can be one of
  `client_secret_basic`, `client_secret_post`. If this field is omitted, a method from
  the server's token auth methods list will be used.

**NOTE**: There is a global setting that applies to all configured OIDC-based Identity Providers:
`enable_pkce`. This option controls whether `Proof Key for Code Exchange` (PKCE) is enabled for
the authentication flow.
```yaml
---
sso:
enable_pkce: true
...
```
{{% /tab %}}
{{% tab header="SAML" %}}
- `entity_id` (_required_) - IdP entity ID, should be equal to the corresponding setting on the IdP configuration page.
- `metadata_url` (_optional_) - SAML metadata URL. This can typically be found on the IdP configuration page.
- `x509_cert` (_optional_) - The SAML X.509 certificate. Also could be found in the IdP’s configuration.
   If the `metadata_url` is not specified, this parameter becomes **required**.
- `sso_url` (_optional_) - SAML endpoint for the Single Sign-On service. Also could be found in the IdP’s configuration.
  If the `metadata_url` is not specified, this parameter becomes **required**.
- `attribute_mapping` (_required_) - A mapping for users' attributes.
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
      name: OIDC-based IdP
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
      name: SMAL-based IdP
      entity_id: <idp-entity-id>
      email_domain: example.com
      # specify metadata_url or sso_url and x509_cert
      metadata_url: http://example.com/path/to/saml/metadata/
      sso_url: <Login URL>
      x509_cert: |
        -----BEGIN CERTIFICATE-----
        certificate content
        -----END CERTIFICATE-----

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
![](/images/sso_enabled.jpeg)

More information about OIDC-based and SAML-based IdP configuration expected by Django Allauth
can be found [here](https://docs.allauth.org/en/latest/socialaccount/providers/openid_connect.html)
and [here](https://docs.allauth.org/en/latest/socialaccount/providers/saml.html) respectively.


## Platform specific IdP configuration
### Microsoft Entra ID

#### OpenId Connect
Follow these steps to configure an application on the `Azure` platform:

##### **Step 1: Register an OIDC-based Application**

To start, log into your [Microsoft Azure Portal](https://portal.azure.com/#home). Once you're in:
1. Navigate to the  `Microsoft Entra ID` service -> `App registrations` section in the menu on the left.
1. Clink on the `+ New registration` button.
1. Enter application name
1. Select `Supported account types` based on your needs
1. Add `Redirect URI`: choose `Web` platform and set `<scheme:cvat_domain>/api/auth/oidc/<idp-id:azure-oidc>/login/callback/`
   to the value field
  ![](/images/azure_oidc_1.jpeg)
1. Click on the`Register` button

{{% alert title="Note" color="primary" %}}
More information on how to configure an OIDC-based application on the Azure platform can be found
[here](https://learn.microsoft.com/en-us/power-pages/security/authentication/openid-settings#create-an-app-registration-in-azure).
{{% /alert %}}

You’ve now created an app, but one more step is needed to finalize the configuration.

##### **Step 2: Configure credentials**

1. Navigate to the `Overview` tab of your newly created application.
   ![](/images/azure_oidc_2.jpeg)
1. In the `Client credentials` section, click the `Add a certificate or secret` link.
   This will take you to the `Certificates & secrets` page.
1. Click `+ New client secret`.
1. In the popup form, enter a description and select an expiration period, then click `Add`.
   ![](/images/azure_oidc_3.jpeg)

The newly created secret will appear in the list.
Make sure to copy the value now — you won’t be able to see it again later.
![](/images/azure_oidc_4.jpeg)

##### **Step 3: Configure CVAT**

Utilize the example below as a template for your configuration:

```yaml
sso:
  enabled: true
  selection_mode: email_address
  identity_providers:
   - id: <idp-id:azure-oidc>
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

Follow these steps to configure an application on the `Azure` platform:

##### **Step 1: Register an SAML-based Application**

To start, log into your [Microsoft Azure Portal](https://portal.azure.com/#home). Once you're in:
1. Navigate to the  `Microsoft Entra ID` service -> `Enterprise applications` section in the menu on the left.
1. Click `+ New application` and enter a name for the application in the popup window, then click `Create`.
   ![](/images/azure_saml_1.jpeg)

You’ve now created an app, but a few more steps are needed to finalize the configuration.

##### **Step 2: Configure an created application**

1. Navigate to the `Single sign-on` section in the menu on the left
1. Choose the SAML protocol as the single sign on method
   ![](/images/azure_saml_2.jpeg)
1. Edit `Basic SAML Configuration`:
   - `Identifier (Entity ID)`: `<scheme:cvat_domain>/api/auth/saml/<idp-id:azure-saml>/metadata/`
   - `Reply URL (Assertion Consumer Service URL)`: `<scheme:cvat_domain>/api/auth/saml/<idp-id:azure-saml>/acs/`
    ![](/images/azure_saml_3.jpeg)
   - Save changes
1. Edit `Attributes & Claims`
   1. Add a new `uid` claim:
      - Name: `uid`
      - Namespace: `http://schemas.xmlsoap.org/ws/2005/05/identity/claims`
      - Source: `attribute`
      - Source attribute: `user.objectid`
        ![](/images/azure_saml_4.jpeg)

{{% alert title="Note" color="primary" %}}
More information on how to configure an application on Azure platform can be
found [here](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/add-application-portal-setup-sso).
{{% /alert %}}

##### **Step 3: Assign users and groups**

At this point, no users or groups have been assigned to the application.
To grant access:
1. Navigate to the `Users and groups` section of the application.
1. Click the `+ Add user/group` button.
1. Select the users or groups you want to assign.
1. Confirm selection.

The selected users or groups will now appear in the assignment list.

That's it, now we can move on to the configuration in CVAT.

##### **Step 4: Configure CVAT**

Utilize the example below as a template for your configuration:

```yaml
sso:
  enabled: true
  selection_mode: email_address
  identity_providers:
  - id: <idp-id:azure-saml>
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
Actual `Microsoft Entra Identifier` and `App Federation Metadata Url` values may be found
on the `Single sign-on` tab of the created application

![](/images/azure_saml_5.jpeg)
{{< /alert >}}

After running CVAT with updated config file, users will be able to authenticate using configured Identity Provider.

### Okta
#### OpenId Connect
Follow these steps to configure an application on the `Okta` platform:

##### **Step 1: Register an OIDC-based Application**

To start, log into your [Okta admin dashboard](https://login.okta.com/). Once you're in:
1. Navigate to the `Applications` section in the menu on the left.
1. Clink on the `Create App integration` button.
1. Select `OIDC - OpenID Connect` as a sign-in method and `Web Application` type.
  ![](/images/okta_oidc_1.jpeg)
1. Fill the form with the following content:
   - `App integration name`: enter a name for the application
   - `Sign-in redirect URIs`: `<scheme:cvat_domain>/api/auth/oidc/<idp-id:okta-oidc>/login/callback/`
   - Select option in the `Controlled access` to match your requirements. In this example we'll use `Skip group assignment for now`.
   ![](/images/okta_oidc_2.jpeg)

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
![](/images/okta_oidc_3.jpeg)

##### **Step 3: Configure CVAT**

Utilize the example below as a template for your configuration:

```yaml
sso:
  enabled: true
  selection_mode: email_address
  identity_providers:
   - id: <idp-id:okta-oidc>
    protocol: OIDC
    name: Okta OIDC-based IdP
    server_url: https://<okta_domain>/
    client_id: <client_id>
    client_secret: <client_secret>
    email_domain: <company_email_domain>
```

{{< alert title="Tip" >}}
Actual `Client ID` and `Client secret` key values may be found on the `General` tab of the created application
![](/images/okta_oidc_4.jpeg)
{{< /alert >}}

After running CVAT with updated config file, users will be able to authenticate using configured Identity Provider.

#### SAML
Follow these steps to configure an application on the `Okta` platform:

##### **Step 1: Register an SAML-based Application**

To start, log into your [Okta admin dashboard](https://login.okta.com/). Once you're in:
1. Navigate to the `Applications` section in the menu on the left.
1. Clink on the `Create App integration` button.
1. Select `SAML 2.0` as a sign-in method, then click `Next`.
   ![](/images/okta_saml_1.jpeg)
1. Fill the form with general setting and go to the next configuration step.
1. On the `Configure SAML` form set the following fields:
   - `Single sign-on URL`:` <scheme:cvat_domain>/api/auth/saml/<idp-id:okta-saml>/acs/`
   - `Audience URI (SP Entity ID`: `<scheme:cvat_domain>/api/auth/saml/<idp-id:okta-saml>/metadata/`
   ![](/images/okta_saml_2.jpeg)
1. Define attribute statements that will be shared with CVAT.
   In our example we will use the `Basic` attribute name format and set the mapping as showed below:
   - `firstName`: `user.firstName`
   - `lastName`: `user.lastName`
   - `username`: `user.login`
   - `email`: `user.email`
   - `uid`: `user.getInternalProperty("id")`

   ![](/images/okta_saml_3.jpeg)
   {{% alert title="Tip" %}}
   If attribute mapping needs to be adapted, follow the official
   [documentation](https://help.okta.com/oie/en-us/content/topics/apps/define-attribute-statements.htm)
   on how to configure `Attribute Statements`
   {{% /alert %}}
1. Navigate to the next configuration step and fill the `Feedback` form.

You’ve now created an app, but a few more steps are needed to finalize the configuration.

##### **Step 2: Simplify login process**

If CVAT is configured to require email verification, it expects the Identity Provider to include
the `email_verified` claim. However, Okta does not send this claim by default. As a result, users
will receive a confirmation email with a verification link.

There is an option to include email verification claim on sign-in step:
1. Add one more mapping `emailVerified` -> `user.emailVerified` on SAML-based application configuration step:
   1. Navigate to the `SAML Settings` on the `General` tab and click `Edit`
   1. Add one more attribute mapping as it was describe on app configuration step
1. Add custom user attribute `emailVerified`:
   - Navigate to the `Directory` section in the menu on the left -> `Profile Editor` item
   - Select default user profile from the list (`User (default)`)
   - Click `+ Add Attribute`
   - Fill out the form with your desired values, making sure to select the `boolean` data type
   ![](/images/okta_saml_4.jpeg)
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
  - id: <idp-id:okta-saml>
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
![](/images/okta_saml_5.jpeg)
{{< /alert >}}

After running CVAT with updated config file, users will be able to authenticate using configured Identity Provider.

### Auth0
#### OpenID connect

Follow these steps to configure an application in the `Auth0` platform:

##### **Step 1: Register an OIDC-based Application**

To start, log into your [Auth0 dashboard](https://manage.auth0.com/dashboard). Once you're in:

1. Navigate to the `Applications` section in the menu on the left, click `+ Create Application`.
1. Enter a name for the application and choose the `Regular Web Applications` type, then click `Create`.

![](/images/auth0_oidc_1.jpeg)

You’ve now created an app, but a one more step is needed to finalize the configuration.

##### **Step 2: Configure an created application**

1. In the `Settings` tab of your new application, scroll down to the `Application URIs` section.
1. Add `<scheme:cvat_domain>/api/auth/oidc/<idp-id:auth0-oidc>/login/callback/` to the `Allowed Callback URLs`.
1. Save changes.

![](/images/auth0_oidc_2.jpeg)

That's it, now we can move on to the configuration in CVAT.

##### **Step 3: Configure CVAT**

Utilize the example below as a template for your configuration:

```yaml
sso:
  enabled: true
  selection_mode: email_address
  identity_providers:
   - id: <idp-id:auth0-oidc>
    protocol: OIDC
    name: Auth0 OIDC-based IdP
    server_url: https://<auth0_domain>/
    client_id: <client_id>
    client_secret: <client_secret>
    email_domain: <company_email_domain>
```


{{< alert title="Tip" >}}
`Client ID`, `Client Secret` and `Domain` can be found in the `Basic Information` section of application settings
![](/images/auth0_oidc_3.jpeg)
{{< /alert >}}

After running CVAT with updated config file, users will be able to authenticate using configured Identity Provider.

#### SAML

Follow these steps to configure an application in the `Auth0` platform:

##### **Step 1: Register an SAML-based Application**

To start, log into your [Auth0 dashboard](https://manage.auth0.com/dashboard). Once you're in:

1. Navigate to the `Applications` section in the menu on the left, click `+ Create Application`.
1. Enter a name for the application and choose the `Regular Web Applications` type, then click `Create`.

![](/images/auth0_saml_1.jpeg)

You’ve now created an app, but a few more steps are needed to finalize the configuration.

##### **Step 2: Configure an created application**

1. Navigate to the `Addons` tab of the created application and click on the `SAML2 WEB APP` button.
   ![](/images/auth0_saml_2.jpeg)
1. Open the `Settings` tab in the popup window and set the following configuration:
   ![](/images/auth0_saml_3.jpeg)

   - `Application Callback URL`: `<scheme:cvat_domain>/api/auth/saml/<idp-id:auth0-saml>/acs/`
   - `Settings`: enter a JSON object like the following:
   ```json
   {
     "audience": "<scheme:cvat_domain>/api/auth/saml/<idp-id:auth0-saml>/metadata/",
     "recipient": "<scheme:cvat_domain>/api/auth/saml/<idp-id:auth0-saml>/acs/",
     "destination": "<scheme:cvat_domain>/api/auth/saml/<idp-id:auth0-saml>/acs/",
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

{{% alert title="Note" color="primary" %}}
More information on how to configure an application on Auth0 platform can be
found [here](https://auth0.com/docs/authenticate/single-sign-on/outbound-single-sign-on/configure-auth0-saml-identity-provider#configure-saml-sso-in-auth0).
{{% /alert %}}

That's it, now we can move on to the configuration in CVAT.

##### **Step 3: Configure CVAT**

Utilize the example below as a template for your configuration:

```yaml
sso:
  enabled: true
  selection_mode: email_address
  identity_providers:
  - id: <idp-id:auth0-saml>
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
![](/images/auth0_saml_4.jpeg)
{{< /alert >}}

After running CVAT with updated config file, users will be able to authenticate using configured Identity Provider.

### Keycloak

To configure SSO in terms of Keycloak we need to create a `client`.

#### OpenID Connect
Follow these steps to do that:

##### **Step 1: Register an OIDC-based Client**

To start, go to the Keycloak service (by default it is listening for http and https requests
using the ports 8080 and 8443, respectively) and log into your admin account. Once you're in:

1. Under desired `realm` navigate to the `Clients` section and click `create client`.
1. Fill out the general client settings:
   ![](/images/keycloak_oidc_1.jpeg)
   - `Client type`: OpenID Connect
   - `Client ID`: enter client identifier
   - Enter a name for the client, e.g. OIDC-based client
1. On the next step enable the `Client authentication` toggle.
   ![](/images/keycloak_oidc_2.jpeg)
1. In the `Login settings` section, provide the following values:
   ![](/images/keycloak_oidc_3.jpeg)
   - `Home URL`: `<scheme:cvat_domain>`
   - `Valid redirect URIs`: `<scheme:cvat_domain>/api/auth/oidc/<idp-id:keycloak-oidc>/login/callback/`
   - `Web origins`: `<scheme:cvat_domain>`

That's it, now we can move on to the configuration in CVAT.

##### **Step 2: Configure CVAT**

Utilize the example below as a template for your configuration:

```yaml
sso:
  enabled: true
  selection_mode: email_address
  identity_providers:
    - id: <idp-id:keycloak-oidc>
      protocol: OIDC
      name: Keycloak OIDC-based Identity Provider
      server_url: <scheme:keycloak_domain>/realms/<custom_realm>/.well-known/openid-configuration
      client_id: <Client ID>
      client_secret: <Client Secret>
      email_domain: <company_email_domain>
```

{{< alert title="Tip" >}}
Actual `Client Secret`value can be found on the `Credentials` tab of the created OIDC client
![](/images/keycloak_oidc_4.jpeg)
{{< /alert >}}
After running CVAT with updated config file, users will be able to authenticate using configured Identity Provider.

#### SAML

Follow these steps to configure a client:

##### **Step 1: Register a SAML-based Client**

To start, go to the Keycloak service (by default it is listening for http and https requests
using the ports 8080 and 8443, respectively) and log into your admin account. Once you're in:

1. Under desired `realm` navigate to the `Clients` section and click `create client`.
1. Fill out the general client settings:
   ![](/images/keycloak_saml_1.jpeg)
   - `Client type`: SAML
   - Set the `Clint ID` the URL: `<scheme:cvat_domain>/api/auth/saml/<idp-id:keycloak-saml>/metadata/`
   - Enter a name for the client, e.g. SAML client
1. In the `Login settings` section, provide the following values:
   ![](/images/keycloak_saml_2.jpeg)
   - `Home  URL`: `<scheme:cvat_domain>`
   - `Valid redirect URIs`: `<scheme:cvat_domain>/api/auth/saml/<idp-id:keycloak-saml>/acs/`

You’ve now created an app, but a few more steps are needed to finalize the configuration.

##### **Step 2: Configure a created client**

1. Navigate to the general settings of the created client, scroll down to the `SAML capabilities` section.
1. Update the following parameters:
   <!-- (TODO: probably need to keep it undefined, other providers work) -->
   - `Name ID format`: email
   - `Force name ID format`: `On`
1. Navigate to the `Keys` tab and enable the `Client signature required` toggle.
1. Configure attributes & claims:
   1. Navigate to the `Client scopes` tab on the created client -> dedicated scopes for the client.
      You will see that there is no configured mappers.
      ![](/images/keycloak_saml_3.jpeg)
   1. Set up mappers for the following attributes:
      - uid
      - first_name
      - last_name
      - username
      - email

      For attributes like `email`, `first name`, and `last name`, you can either
      - Use the predefined mappers
        ![](/images/keycloak_saml_4.jpeg)
      - Or follow the manual configuration steps to create them yourself.

      To configure other mappers click `Configure a new mapper` if it is a first mapper or `Add mapper`
      -> `By configuration` and then select `User Property`.

      For instance, to configure a mapper for the `username` attribute, fill in the form as it is done below:
      ![](/images/keycloak_saml_5.jpeg)

      - `Name`: username
      - `Property`: username
      - `SAML Attribute Name`: usernameAttribute

That's it, now we can move on to the configuration in CVAT.

##### **Step 3: Configure CVAT**

Utilize the example below as a template for your configuration:

```yaml
sso:
  enabled: true
  selection_mode: email_address
  identity_providers:
    - id: <idp-id:keycloak-saml>
      protocol: SAML
      name: Keycloak SAML-based Identity Provider
      entity_id: <scheme:keycloak_domain>/realms/<custom_realm>
      metadata_url: <scheme:keycloak_domain>/realms/<custom_realm>/protocol/saml/descriptor

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
Actual `Metadata URL` may be found in the `Realm settings` on the `General` tab
![](/images/keycloak_saml_6.jpeg)
{{< /alert >}}
After running CVAT with updated config file, users will be able to authenticate using configured Identity Provider.
