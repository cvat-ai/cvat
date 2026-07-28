---
title: 'Disable registration or password-based login'
linkTitle: 'Disable registration or password-based login'
weight: 7
description: 'Disallow users to create accounts or login using passwords for a Self-hosted solution'
aliases:
  - /docs/enterprise/disable-basic-authentication/
products:
  - enterprise
---

{{% alert title="Note" color="primary" %}}
This is a paid feature available for [Enterprise clients](https://www.cvat.ai/pricing/on-prem).
{{% /alert %}}

# Update authentication config

Please add the following lines to your `auth_config.yml` (or create such file if it does not exist)
to prevent registering user accounts and disable password-based login:

```yaml
basic:
  registration:
    enabled: false

  login:
    enabled: false
```

You may permit login, by changing the corresponding flag to `true`.

# Start CVAT

{{< alert title="Restart required" color="warning" >}}
If CVAT is already running, don't forget to restart the containers to apply authentication configuration.
{{< /alert >}}

Once the configuration file is created/updated, export corresponding environment variable before running CVAT:

```bash
export AUTH_CONFIG_PATH="<path_to_auth_config>"
```
