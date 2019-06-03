## Google Analytics for CVAT

### Description

This application allows you to integrate Google Analytics with CVAT

### Configuring

  * Set up a Google Analytics (GA) account and create a GA New Property for CVAT
  * Copy the Tracking ID for the new property
  * Navigate to `/cvat/cvat/apps/google/static/google/js` and use something like `vi` to edit the `enginePlugin.js` file
  * Paste your Tracking ID replacing the placeholders `<GA_Tracking_ID_Here>`.  Example code below:
  
```
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=<GA_Tracking_ID_Here>"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '<GA_Tracking_ID_Here>');
</script>
```
  
  * Save the changes
  * Navigate to `cvat/cvat/settings` and use something like `vi` to edit the `base.py` file
  * Scroll down to the `INSTALLED_APPS` section and remove the `#` from in front of the `cvat.apps.google` entry.  Example code below:
  
```
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'cvat.apps.engine',
    'cvat.apps.dashboard',
    'cvat.apps.authentication',
    'cvat.apps.documentation',
    'cvat.apps.git',
 #   'cvat.apps.google',
 ```
  
  * Save the changes
  * Do a `docker-compose` `down`, `build`, and `run` to get the changes included in CVAT.
  * Start using CVAT then check the GA UI to make sure that data is flowing.
