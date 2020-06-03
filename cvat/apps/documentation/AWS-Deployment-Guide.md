### AWS-Deployment Guide

There are two ways of deploying the CVAT.
1. **On Nvidia GPU Machine:** Tensorflow annotation feature is dependent on GPU hardware. One of the easy ways to launch CVAT with the tf-annotation app is to use AWS P3 instances, which provides the NVIDIA GPU. Read more about [P3 instances here.](https://aws.amazon.com/about-aws/whats-new/2017/10/introducing-amazon-ec2-p3-instances/)
Overall setup instruction is explained in [main readme file](https://github.com/opencv/cvat/), except Installing Nvidia drivers.  So we need to download the drivers and install it. For Amazon P3 instances, download the Nvidia Drivers from Nvidia website. For more check [Installing the NVIDIA Driver on Linux Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/install-nvidia-driver.html) link.

2. **On Any other AWS Machine:** We can follow the same instruction guide mentioned in the
[installation instructions](https://github.com/opencv/cvat/blob/master/cvat/apps/documentation/installation.md).
The additional step is to add a [security group and rule  to allow  incoming connections](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-network-security.html).

For any of above, don't forget to add exposed AWS public IP address or hostname to `docker-compose.override.yml`:

```
version: "2.3"
services:
  cvat_proxy:
    environment:
      CVAT_HOST: your-instance.amazonaws.com
```
