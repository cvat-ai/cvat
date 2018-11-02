## Git Integration For Annotation Storage

### Description

Component allows to integrate any git repository with CVAT task for annotation storage.
Application supports github or gitlab repositories (include custom gitlab servers).
Application uses the specified git user for work with remote repositories and SSH protocol for authorization.

### Installation

* Setup variables ```CVAT_HEADLESS_USERNAME``` and ```CVAT_HEADLESS_EMAIL``` in the docker-compose.git.yml.
* Put private SSH key for this user into ```components/ssh/keys```. Public key corresponding to this private key should be attached to used github user.
* Build CVAT image with SSH and GIT application as listed below.
* Setup your repository URL in create task dialog. You can change a attached repository later.
* Annotate a task.
* Press button "Git Repository Sync" at dashboard.
* In dialog window press button "Push" and waiting some time.
* Annotation will be dumped, archived and pushed to ```cvat_username``` branch of remote repository.


### Dependencies

* SSH component with predefined valid ssh keys for the Git user.


### Build docker image
```bash
# From project root directory
docker-compose -f docker-compose.yml -f components/ssh/docker-compose.ssh.yml -f components/git/docker-compose.git.yml build
```

### Run docker container
```bash
# From project root directory
docker-compose -f docker-compose.yml -f components/ssh/docker-compose.ssh.yml -f components/git/docker-compose.git.yml up -d
```
