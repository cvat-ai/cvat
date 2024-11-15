<!--lint disable maximum-heading-length-->

---

title: 'LDAP Backed Authentication'
linkTitle: 'LDAP Login'
weight: 40
description: 'Allow users to login with credentials from a central source'

---

<!--lint disable maximum-line-length-->

### The creation of `settings.py`
When integrating LDAP login, we need to create an overlay to the default CVAT
settings located in
[cvat/settings/production.py](https://github.com/cvat-ai/cvat/blob/develop/cvat/settings/production.py).
This overlay is where we will configure Django to connect to the LDAP server.

The main issue with using LDAP is that different LDAP implementations have
different parameters. So the options used for Active Directory backed
authentication will differ if you were to be using FreeIPA.

### Update `docker-compose.override.yml`

In your override config you need to passthrough your settings and tell CVAT to
use them by setting the `DJANGO_SETTINGS_MODULE` variable.

```yml
services:
  cvat_server:
    environment:
      DJANGO_SETTINGS_MODULE: settings
    volumes:
      - ./settings.py:/home/django/settings.py:ro
```

### Active Directory Example

The following example should allow for users to authenticate themselves against
Active Directory. This example requires a dummy user named `cvat_bind`. The
configuration for the bind account does not need any special permissions.

When updating `AUTH_LDAP_BIND_DN`, you can write out the account info in two
ways. Both are documented in the config below.

This config is known to work with Windows Server 2022, but should work for older
versions and Samba's implementation of Active Directory.

```py
# We are overlaying production
from cvat.settings.production import *

# Custom code below
import ldap
from django_auth_ldap.config import LDAPSearch
from django_auth_ldap.config import NestedActiveDirectoryGroupType

# Notify CVAT that we are using LDAP authentication
IAM_TYPE = 'LDAP'

# Talking to the LDAP server
AUTH_LDAP_SERVER_URI = "ldap://ad.example.com" # IP Addresses also work
ldap.set_option(ldap.OPT_REFERRALS, 0)

_BASE_DN = "CN=Users,DC=ad,DC=example,DC=com"

# Authenticating with the LDAP server
AUTH_LDAP_BIND_DN = "CN=cvat_bind,%s" % _BASE_DN
# AUTH_LDAP_BIND_DN = "cvat_bind@ad.example.com"
AUTH_LDAP_BIND_PASSWORD = "SuperSecurePassword^21"

AUTH_LDAP_USER_SEARCH = LDAPSearch(
    _BASE_DN,
    ldap.SCOPE_SUBTREE,
    "(sAMAccountName=%(user)s)"
)

AUTH_LDAP_GROUP_SEARCH = LDAPSearch(
    _BASE_DN,
    ldap.SCOPE_SUBTREE,
    "(objectClass=group)"
)

# Mapping Django field names to Active Directory attributes
AUTH_LDAP_USER_ATTR_MAP = {
    "user_name": "sAMAccountName",
    "first_name": "givenName",
    "last_name": "sn",
    "email": "mail",
}

# Group Management
AUTH_LDAP_GROUP_TYPE = NestedActiveDirectoryGroupType()

# Register Django LDAP backend
AUTHENTICATION_BACKENDS += ['django_auth_ldap.backend.LDAPBackend']

# Map Active Directory groups to Django/CVAT groups.
AUTH_LDAP_ADMIN_GROUPS = [
    'CN=CVAT Admins,%s' % _BASE_DN,
]
AUTH_LDAP_WORKER_GROUPS = [
    'CN=CVAT Workers,%s' % _BASE_DN,
]
AUTH_LDAP_USER_GROUPS = [
    'CN=CVAT Users,%s' % _BASE_DN,
]

DJANGO_AUTH_LDAP_GROUPS = {
    "admin": AUTH_LDAP_ADMIN_GROUPS,
    "user": AUTH_LDAP_USER_GROUPS,
    "worker": AUTH_LDAP_WORKER_GROUPS,
}
```
### FreeIPA Example

The following example should allow for users to authenticate themselves against
FreeIPA. This example requires a dummy user named `cvat_bind`. The configuration
for the bind account does not need any special permissions.

When updating `AUTH_LDAP_BIND_DN`, you can only write the user info in one way,
unlike with [Active Directory](#active-directory-example)

This config is known to work with AlmaLinux 8, but may work for other
versions and flavors of Enterprise Linux.

```py
# We are overlaying production
from cvat.settings.production import *

# Custom code below
import ldap
from django_auth_ldap.config import LDAPSearch
from django_auth_ldap.config import GroupOfNamesType

# Notify CVAT that we are using LDAP authentication
IAM_TYPE = 'LDAP'

_BASE_DN = "CN=Accounts,DC=ipa,DC=example,DC=com"

# Talking to the LDAP server
AUTH_LDAP_SERVER_URI = "ldap://ipa.example.com" # IP Addresses also work
ldap.set_option(ldap.OPT_REFERRALS, 0)

# Authenticating with the LDAP server
AUTH_LDAP_BIND_DN = "UID=cvat_bind,CN=Users,%s" % _BASE_DN
AUTH_LDAP_BIND_PASSWORD = "SuperSecurePassword^21"

AUTH_LDAP_USER_SEARCH = LDAPSearch(
    "CN=Users,%s" % _BASE_DN,
    ldap.SCOPE_SUBTREE,
    "(uid=%(user)s)"
)

AUTH_LDAP_GROUP_SEARCH = LDAPSearch(
    "CN=Groups,%s" % _BASE_DN,
    ldap.SCOPE_SUBTREE,
    "(objectClass=groupOfNames)"
)

# Mapping Django field names to FreeIPA attributes
AUTH_LDAP_USER_ATTR_MAP = {
    "user_name": "uid",
    "first_name": "givenName",
    "last_name": "sn",
    "email": "mail",
}

# Group Management
AUTH_LDAP_GROUP_TYPE = GroupOfNamesType()

# Register Django LDAP backend
AUTHENTICATION_BACKENDS += ['django_auth_ldap.backend.LDAPBackend']

# Map FreeIPA groups to Django/CVAT groups.
AUTH_LDAP_ADMIN_GROUPS = [
    'CN=cvat_admins,CN=Groups,%s' % _BASE_DN,
]
AUTH_LDAP_WORKER_GROUPS = [
    'CN=cvat_workers,CN=Groups,%s' % _BASE_DN,
]
AUTH_LDAP_USER_GROUPS = [
    'CN=cvat_users,CN=Groups,%s' % _BASE_DN,
]

DJANGO_AUTH_LDAP_GROUPS = {
    "admin": AUTH_LDAP_ADMIN_GROUPS,
    "user": AUTH_LDAP_USER_GROUPS,
    "worker": AUTH_LDAP_WORKER_GROUPS,
}
```

### Resources
- [Microsoft - LDAP Distinguished Names](https://docs.microsoft.com/en-us/previous-versions/windows/desktop/ldap/distinguished-names)
  - Elements that make up a distinguished name. Used with user/group searches.
- [Django LDAP Reference Manual](https://django-auth-ldap.readthedocs.io/en/latest/reference.html)
  - Other options that can be used for LDAP authentication in Django.
- [Django LDAP guide using Active Directory (Unofficial)](https://techexpert.tips/django/django-ldap-authentication-active-directory)
  - This is not specific to CVAT but can provide insight about firewall rules.
