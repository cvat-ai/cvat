## Git Integration For Annotation Storage

### Description

This application used to contain functionality for synchronizing CVAT tasks
with Git repositories, which was removed.

The app now only exists to contain migrations, which are needed to ensure that
upgrading from an earlier release deletes the table that this app used to use
for its model.

If a future release of CVAT squashes migrations, then this app should be deleted.
