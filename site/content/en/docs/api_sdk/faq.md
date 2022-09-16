---
title: 'Frequently asked questions'
linkTitle: 'FAQ'
weight: 100
description: ''
---

### My server uses a custom SSL certificate and I don't want to check it.

You can call control SSL certificate check with the `--insecure` CLI argument.
For SDK, you can specify `ssl_verify = True/False` in the `cvat_sdk.core.client.Config` object.
