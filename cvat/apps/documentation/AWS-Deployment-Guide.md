### AWS-Deployment Guide

There are two ways of deploying the CVAT.
- On Nvidia GPU Machine.
Tensorflow annotation feature is dependent on GPU hardware. One of the easy ways to launch CVAT with the tf-annotation app is to use AWS P3 instances, which provides the NVIDIA GPU. Read more about [P3 instances here.](https://aws.amazon.com/about-aws/whats-new/2017/10/introducing-amazon-ec2-p3-instances/)
Overall setup instruction works well explained in [main Readme file](https://github.com/opencv/cvat/) , except Installing Nvidia drivers, when it comes to Amazon P3 instances. For Amazon P3 instances, download the Nvidia Drivers from Nvidia website. For more check [Installing the NVIDIA Driver on Linux Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/install-nvidia-driver.html) link.

- On Ec2 Machine
We can follow the same instruction guide mentioned in the [Readme file](https://github.com/opencv/cvat/). The additional step is to add a [security group and rule  to allow  incoming connections](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-network-security.html).

For any of above, don't forget to add exposed AWS public IP address to `docker-compose.override.com`.
