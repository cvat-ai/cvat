## Git Integration For Annotation Storage

### Description

Application allows to integrate any git repository with CVAT task for annotation storage.
It supports github or gitlab repositories (include custom gitlab servers).
SSH protocol is used for authorization.

### Using

* Put private SSH key for this user into ```cvat/apps/ssh/keys```. Public key corresponding to this private key should be attached to used github user.
* If you didn't put custom keys, they are generated automatically.
* Setup your repository URL and path (relative for repository) in create task dialog.
* Annotate a task.
* Press a button "Git Repository Sync" on the dashboard.
* In a dialog window press the button "Sync" and waiting some time.
* Annotation will be dumped, archived and pushed to remote repository. You can do a pull request manually.
