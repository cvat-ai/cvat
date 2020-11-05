- [Mounting cloud storage](#mounting-cloud-storage)
  - [AWS S3 bucket](#aws-s3-bucket-as-filesystem)
    - [Ubuntu 20.04](#aws_s3_ubuntu_2004)
      - [Mount](#aws_s3_mount)
      - [Automounting](#aws_s3_automounting)
        - [Using /etc/fstab](#aws_s3_using_fstab)
        - [Using systemd](#aws_s3_using_systemd)
      - [Cheking](#aws_s3_cheking)
      - [Unmount](#aws_s3_unmount_filesystem)
  - [Azure container](#microsoft-azure-container-as-filesystem)
    - [Ubuntu 20.04](#azure_ubuntu_2004)
      - [Mount](#azure_mount)
      - [Automounting](#azure_automounting)
        - [Using /etc/fstab]('#azure_using_fstab')
        - [Using systemd](#azure_using_systemd)
      - [Cheking](#azure_cheking)
      - [Unmount](#azure_unmount_filesystem)
  - [Google Drive](#google-drive-as-filesystem)
    - [Ubuntu 20.04](#google_drive_ubuntu_2004)
      - [Mount](#google_drive_mount)
      - [Automounting](#google_drive_automounting)
        - [Using /etc/fstab]('#google_drive_using_fstab')
        - [Using systemd](#google_drive_using_systemd)
      - [Cheking](#google_drive_cheking)
      - [Unmount](#google_drive_unmount_filesystem)

# Mounting cloud storage
## AWS S3 bucket as filesystem
### <a name="aws_s3_ubuntu_2004">Ubuntu 20.04</a>
#### <a name="aws_s3_mount">Mount</a>

1. Install s3fs

```bash
sudo apt install s3fs
```

2. Enter your credentials in a file  `${HOME}/.passwd-s3fs`  and set owner-only permissions:

```bash
echo ACCESS_KEY_ID:SECRET_ACCESS_KEY > ${HOME}/.passwd-s3fs
chmod 600 ${HOME}/.passwd-s3fs
```

3. Uncomment `user_allow_other` in the `/etc/fuse.conf` file: `sudo nano /etc/fuse.conf`
4. Run s3fs, replace `bucket_name`, `mount_point`:

```bash
s3fs <bucket_name> <mount_point> -o allow_other
```

For more details see [here](https://github.com/s3fs-fuse/s3fs-fuse).

#### <a name="aws_s3_automounting">Automounting</a>
Follow the 3 mounting steps above.

##### <a name="aws_s3_using_fstab">Using fstab</a>

1. Create a shell script named aws_s3_fuse(e.g in /usr/bin, as root) with this content
(replace `user_name` on whose behalf the disk will be mounted, `backet_name`, `mount_point`, `/path/to/.passwd-s3fs`):

```bash
#!/bin/bash
sudo -u <user_name> s3fs <backet_name> <mount_point> -o passwd_file=/path/to/.passwd-s3fs -o allow_other
exit 0
```

2. Give it the exec permission:

```bash
sudo chmod +x /usr/bin/aws_s3_fuse
```

3. Edit `/etc/fstab` adding a line like this, replace `mount_point`):

```
/absolute/path/to/aws_s3_fuse  <mount_point>     fuse    allow_other,user,_netdev     0       0
```

##### <a name="aws_s3_using_systemd">Using systemd</a>

1. Create unit file `sudo nano /etc/systemd/system/s3fs.service`.
Replace `user_name`, `bucket_name`, `mount_point`, `/path/to/.passwd-s3fs`

```
[Unit]
Description=FUSE filesystem over AWS S3 bucket
After=network.target

[Service]
Environment="MOUNT_POINT=<mount_point>"
User=<user_name>
Group=<user_name>
ExecStart=s3fs <bucket_name> ${MOUNT_POINT} -o passwd_file=/path/to/.passwd-s3fs -o allow_other
ExecStop=fusermount -u ${MOUNT_POINT}
Restart=always
Type=forking

[Install]
WantedBy=multi-user.target
```

2. Update the system configurations, enable unit autorun when the system boots.

```bash
sudo systemctl daemon-reload
sudo systemctl enable s3fs.service
sudo systemctl start s3fs.service
```

#### <a name="aws_s3_checking">Cheking</a>
A file `/etc/mtab` contains records of currently mounted filesystems.
```bash
cat /etc/mtab | grep 's3fs'
```

#### <a name="aws_s3_unmount_filesystem">Unmount filesystem</a>
```bash
fusermount -u <mount_point>
```

## Microsoft Azure container as filesystem
### <a name="azure_ubuntu_2004">Ubuntu 20.04</a>
#### <a name="azure_mount">Mount</a>
1. Set up the Microsoft package repository.(More [here](https://docs.microsoft.com/en-us/windows-server/administration/Linux-Package-Repository-for-Microsoft-Software#configuring-the-repositories))

```bash
wget https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update
```

2. Install `blobfuse` and `fuse`

```bash
sudo apt-get install blobfuse fuse
```
For more details see [here](https://github.com/Azure/azure-storage-fuse/wiki/1.-Installation)

3. Create enviroments(replace `account_name`, `account_key`, `mount_point`)

```bash
export AZURE_STORAGE_ACCOUNT=<account_name>
export AZURE_STORAGE_ACCESS_KEY=<account_key>
MOUNT_POINT=<mount_point>
```

4. Create a folder for cache:
```bash
sudo mkdir -p /mnt/blobfusetmp
```

5. Make sure the file must be owned by the user who mounts the container:
```bash
sudo chown <user> /mnt/blobfusetmp
```

6. Create the mount point, if it doesn't exists:
```bash
mkdir -p ${MOUNT_POINT}
```

7. Uncomment `user_allow_other` in the `/etc/fuse.conf` file: `sudo nano /etc/fuse.conf`
8. Mount container(replace `your_container`):

```bash
blobfuse ${MOUNT_POINT} --container-name=<your_container> --tmp-path=/mnt/blobfusetmp -o allow_other
```

#### <a name="azure_automounting">Automounting/a<>
Follow the 3 mounting steps above.
##### <a name="azure_using_fstab">Using fstab</a>

1. Create configuration file `connection.cfg` with same content, change accountName,
select one from accountKey or sasToken and replace with your value

```
accountName <account-name-here>
# Please provide either an account key or a SAS token, and delete the other line.
accountKey <account-key-here-delete-next-line>
#change authType to specify only 1
sasToken <shared-access-token-here-delete-previous-line>
authType <MSI/SAS/SPN/Key/empty>
containerName <insert-container-name-here>
```

2. create `azure_fuse`(e.g in /usr/bin, as root) with content below
(replace `user_name` on whose behalf the disk will be mounted, `mount_point`, `/path/to/blobfusetmp`,`/path/to/connection.cfg`):

```
#!/bin/bash
sudo -u <user_name> blobfuse <mount_point> --tmp-path=/path/to/blobfusetmp  --config-file=/path/to/connection.cfg -o allow_other
exit 0

```

3. Give it the exec permission:
```bash
sudo chmod +x /usr/bin/azure_fuse
```

4. Edit `/etc/fstab` with the blobfuse script. Add the following line(replace paths):
`/absolute/path/to/mount.sh </path/to/desired/mountpoint> fuse _netdev,allow_other`

##### <a name="azure_using_systemd">Using systemd</a>

1. Create unit file `sudo nano /etc/systemd/system/blobfuse.service`.
Replace `user_name`, `mount_point`, `container_name`,`/path/to/connection.cfg`

```
[Unit]
Description=FUSE filesystem over Azure container
After=network.target

[Service]
Environment="MOUNT_POINT=<mount_point>"
User=<user_name>
Group=<user_name>
ExecStart=blobfuse ${MOUNT_POINT} --container-name=<container_name> --tmp-path=/mnt/blobfusetmp --config-file=/path/to/connection.cfg -o allow_other
ExecStop=fusermount -u ${MOUNT_POINT}
Restart=always
Type=forking

[Install]
WantedBy=multi-user.target
```

2. Update the system configurations, enable unit autorun when the system boots:

```bash
sudo systemctl daemon-reload
sudo systemctl enable blobfuse.service
sudo systemctl blobfuse s3fs.service
```
Or for more detail [see here](https://github.com/Azure/azure-storage-fuse/tree/master/systemd)

#### <a name="azure_cheking">Cheking</a>
A file `/etc/mtab` contains records of currently mounted filesystems.
```bash
cat /etc/mtab | grep 'blobfuse'
```

#### <a name="azure_unmount_filesystem">Unmount filesystem</a>
```bash
fusermount -u <mount_point>
```

If you have any mounting problems, check out the [answers](https://github.com/Azure/azure-storage-fuse/wiki/3.-Troubleshoot-FAQ)
to common problems

## Google Drive as filesystem
### <a name="google_drive_ubuntu_2004">Ubuntu 20.04</a>
#### <a name="google_drive_mount">Mount</a>
To mount a google drive as a filesystem in user space(FUSE)
you can use [google-drive-ocamlfuse](https://github.com/astrada/google-drive-ocamlfuse)
To do this follow the instructions below:

1. Install google-drive-ocamlfuse

```
sudo add-apt-repository ppa:alessandro-strada/ppa
sudo apt-get update
sudo apt-get install google-drive-ocamlfuse
```

2. Run `google-drive-ocamlfuse` without parameters

```bash
google-drive-ocamlfuse
```
This command will create the default application directory (~/.gdfuse/default), containing the configuration file config
(see the [wiki](https://github.com/astrada/google-drive-ocamlfuse/wiki) page for more details about configuration).
And it will start a web browser to obtain authorization to access your Google Drive.
This will let you modify default configuration before mounting the filesystem.

Then you can choose a local directory to mount your Google Drive (e.g.: ~/GoogleDrive).

3. Create the mount point, if it doesn't exist(replace mount_point):

```bash
mountpoint="<mount_point>"
mkdir -p $mountpoint
```

4. Uncomment `user_allow_other` in the `/etc/fuse.conf` file: `sudo nano /etc/fuse.conf`

5. Mount the filesystem
```bash
google-drive-ocamlfuse -o allow_other $mountpoint
```

#### <a name="google_drive_automounting">Automounting</a>
Follow the 3 mounting steps above.
##### <a name="google_drive_using_fstab">Using fstab</a>

1. Create a shell script named gdfuse(e.g in /usr/bin, as root) with this content
(replace `user_name` on whose behalf the disk will be mounted, `label`, `mount_point`):

```bash
#!/bin/bash
sudo -u <user_name> google-drive-ocamlfuse -o allow_other -label <label> <mount_point>
exit 0

```
2. Give it the exec permission:
```bash
sudo chmod +x /usr/bin/gdfuse
```

3. Edit `/etc/fstab` adding a line like this, replace `mount_point`):
```
/absolute/path/to/gdfuse  <mount_point>     fuse    allow_other,user,_netdev     0       0
```

For more details see [here](https://github.com/astrada/google-drive-ocamlfuse/wiki/Automounting)

##### <a name="google_drive_using_systemd">Using systemd</a>

1. Create unit file `sudo nano /etc/systemd/system/google-drive-ocamlfuse.service`.
Replace `user_name`, `label`(default `label=default`), `mount_point`.

```
[Unit]
Description=FUSE filesystem over Google Drive
After=network.target

[Service]
Environment="MOUNT_POINT=<mount_point>"
User=<user_name>
Group=<user_name>
ExecStart=google-drive-ocamlfuse -label <label> ${MOUNT_POINT}
ExecStop=fusermount -u ${MOUNT_POINT}
Restart=always
Type=forking

[Install]
WantedBy=multi-user.target
```

2. Update the system configurations, enable unit autorun when the system boots.

```bash
sudo systemctl daemon-reload
sudo systemctl enable google-drive-ocamlfuse.service
sudo systemctl start google-drive-ocamlfuse.service
```

For more details see [here](https://github.com/astrada/google-drive-ocamlfuse/wiki/Automounting)

#### <a name="google_drive_cheking">Cheking</a>
A file `/etc/mtab` contains records of currently mounted filesystems.
```bash
cat /etc/mtab | grep 'google-drive-ocamlfuse'
```

#### <a name="google_drive_unmount_filesystem">Unmount filesystem</a>
```bash
fusermount -u <mount_point>
```
