---
title: 'Authorization'
linkTitle: 'Authorization'
weight: 1
---
1. Open [authorization page](https://app.cvat.ai/auth/login).
2. Log in or create an account.
3. Create a superuser account:

  ```bash
    docker exec -it cvat_server bash -ic 'python3 ~/manage.py createsuperuser'
  ```

4. Modify permissions for the new user in the [Django administration panel](http://localhost:8080/admin). There are several groups:
* **admin** — _here goes some info about this role and why a user may need it_;
* **user** — _here goes some info about this role and why a user may need it_;
* **annotator** — _here goes some info about this role and why a user may need it_;
* **observer** — _here goes some info about this role and why a user may need it_.

### Administration panel

Use the [Django administration panel](http://localhost:8080/admin) to:

* create a user;
* edit a user;
* delete a user;
* control permissions and access to the tool.

  ![](/images/image115.jpg)
