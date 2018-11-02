## Custom SSH Keys

### Description

If you need add custom SSH keys to your CVAT image, you can use this component.
Just put your keys to ```components/ssh/keys``` dir and them will be copied to ```/home/django/.ssh``` during build.
Don't forget include a corresponding docker-compose file.

### Build docker image
```bash
# From project root directory
docker-compose -f docker-compose.yml -f components/ssh/docker-compose.ssh.yml build
```

### Run docker container
```bash
# From project root directory
docker-compose -f docker-compose.yml -f components/ssh/docker-compose.ssh.yml up -d
```
