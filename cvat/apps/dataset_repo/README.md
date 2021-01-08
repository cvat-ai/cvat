## Git Integration For Annotation Storage

### Description

The application allows to integrate any git repository like an annotation storage for a CVAT task.
It supports github or gitlab repositories.
The SSH protocol is used for an authorization.

### Using

- Put a private SSH key into the `ssh` directory. The public key corresponding to this private key should be attached to an github user.
- If you don't put any custom key, it will generated automatically.
- Setup a repository URL and a path (which is relative for a repository) in the create task dialog.
- Annotate a task.
- Press the button "Git Repository Sync" on the dashboard.
- In the dialog window press the button "Sync" and waiting for some time.
- An annotation will be dumped, archived and pushed to the attached remote repository. You can do a pull request manually.
