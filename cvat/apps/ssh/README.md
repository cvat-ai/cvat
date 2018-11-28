## SSH Support

### Description

If you need add custom SSH keys to your CVAT image, you can use this component.
Just put your keys to ```cvat/apps/ssh/keys``` dir and them will be copied to ```/home/django/.ssh``` during build.
Otherwise keys will be generated automatically.
