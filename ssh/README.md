Put your SSH keys and SSH config here and they will be installed to the CVAT container.

If you have any problems with a git repository cloning inside the CVAT:
  * Make sure that SSH keys have been added to the CVAT container: echo ```docker exec -it cvat bash -ic 'ls .ssh'```
  * If you need a proxy for connect to the Internet, specify the socks_proxy variable before build the container. For example:

```bash
socks_proxy=proxy-example.com:1080 docker-compose build
```
  * Try to clone a repository via SSH direct in the container:

```bash
docker exec -it cvat bash -ic 'cd /tmp -r && git clone <ssh_repository_url>'
```
  * Finally try to clone it on your local machine and if it's successful, contact with us via Gitter chat or Github issues.
