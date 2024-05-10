---
title: 'AWS-Deployment Guide'
linkTitle: 'AWS-Deployment Guide'
weight: 4
description: 'Instructions for deploying CVAT on Nvidia GPU and other AWS machines.'
---

There are two ways of deploying the CVAT.

1. **On Nvidia GPU Machine:** Tensorflow annotation feature is dependent on GPU hardware.
   One of the easy ways to launch CVAT with the tf-annotation app is to use AWS P3 instances,
   which provides the NVIDIA GPU.
   Read more about [P3 instances here.](https://aws.amazon.com/about-aws/whats-new/2017/10/introducing-amazon-ec2-p3-instances/)
   Overall setup instruction is explained in [main readme file](https://github.com/cvat-ai/cvat/),
   except Installing Nvidia drivers.
   So we need to download the drivers and install it.
   For Amazon P3 instances, download the Nvidia Drivers from Nvidia website.
   For more check [Installing the NVIDIA Driver on Linux Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/install-nvidia-driver.html)
   link.

2. **On Any other AWS Machine:** We can follow the same instruction guide mentioned in the
   {{< ilink "/docs/administration/basics/installation" "installation instructions" >}}.
   The additional step is to add a [security group and rule to allow incoming connections](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-network-security.html).

For any of above, don't forget to set the `CVAT_HOST` environment variable to the exposed
AWS public IP address or hostname:

```bash
export CVAT_HOST=your-instance.amazonaws.com
```

In case of problems with using hostname, you can also use the public IPV4 instead of hostname.
For AWS or any cloud based machines where the instances need to be terminated or stopped,
the public IPV4 and hostname changes with every stop and reboot.
To address this efficiently, avoid using spot instances that cannot be stopped,
since copying the EBS to an AMI and restarting it throws problems.
On the other hand, when a regular instance is stopped and restarted,
the new hostname/IPV4 can be used to set the  `CVAT_HOST` environment variable.
