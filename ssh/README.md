Put your SSH keys and SSH config here and they will be installed to the CVAT container.
Please do not use encrypted keys that require a passphrase - these keys will not be used.

If you have any problems with a git repository cloning inside the CVAT:

- Make sure that SSH keys have been added to the CVAT container:

```bash
docker exec -it cvat bash -ic 'ls .ssh'
```

- If you need a proxy for connecting to the Internet, specify the socks_proxy variable before build the container. For example:

```bash
socks_proxy=proxy-example.com:1080 docker-compose build
```

- Try to clone a repository via SSH directly in the container by the command:

```bash
docker exec -it cvat bash -ic 'cd /tmp -r && git clone <ssh_repository_url>'
```

- Finally try to clone it on your local machine and if it's successful, contact with us via [Gitter chat](https://gitter.im/opencv-cvat) or [Github issues](https://github.com/opencv/cvat/issues).
