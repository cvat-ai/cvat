#!/bin/sh

set -e

mkdir -p ~/repos/repo.git
git -C ~/repos/repo.git init --bare

mkdir -p ~/.ssh
# Authorize CVAT's client keys
cat /mnt/keys/*.pub > ~/.ssh/authorized_keys

ssh-keygen -A
exec /usr/sbin/sshd -D
