---
title: 'Custom Certificates'
linkTitle: 'Custom Certificates'
description: 'Use Custom Certificates in CVAT'
weight: 100
---

CVAT use traefik as a reverse proxy to manage SSL certificates.
By default, traefik uses Let's Encrypt to generate SSL certificates.
However, you can use your own certificates instead of Let's Encrypt.

See:

- [Setup Custom Certificates](#setup-custom-certificates)
- [Create Certificates Directory](#create-certificates-directory)
- [Change Traefik Configuration](#change-traefik-configuration)
- [Start CVAT](#start-cvat)


## Setup Custom Certificates

### Create Certificates Directory

Create a `certs` directory in the root of the project:

```bash
mkdir -p ./certs

```

Move your certificates to the `./certs` directory:

```bash
mv /path/to/cert.pem ./certs/cert.pem
mv /path/to/key.pem ./certs/key.pem
```

### Change Traefik Configuration

Create `tls.yml` in the root of the project directory with the following content:

```yaml
tls:
  stores:
    default:
      defaultCertificate:
        certFile: /certs/cert.pem
        keyFile: /certs/key.pem
```

Edit the `docker-compose.https.yml` file and change the traefik service configuration as follows:

```yaml
  traefik:
    environment:
      TRAEFIK_ENTRYPOINTS_web_ADDRESS: :80
      TRAEFIK_ENTRYPOINTS_web_HTTP_REDIRECTIONS_ENTRYPOINT_TO: websecure
      TRAEFIK_ENTRYPOINTS_web_HTTP_REDIRECTIONS_ENTRYPOINT_SCHEME: https
      TRAEFIK_ENTRYPOINTS_websecure_ADDRESS: :443
      # Disable Let's Encrypt
      # TRAEFIK_CERTIFICATESRESOLVERS_lets-encrypt_ACME_EMAIL: "${ACME_EMAIL:?Please set the ACME_EMAIL env variable}"
      # TRAEFIK_CERTIFICATESRESOLVERS_lets-encrypt_ACME_TLSCHALLENGE: "true"
      # TRAEFIK_CERTIFICATESRESOLVERS_lets-encrypt_ACME_STORAGE: /letsencrypt/acme.json
    ports:
      - 80:80
      - 443:443
    # Add certificates volume and tls.yml rules
    volumes:
      - ./certs:/certs
      - ./tls.yml:/etc/traefik/rules/tls.yml
```

### Start CVAT

Start CVAT with the following command:

```bash
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d
```
