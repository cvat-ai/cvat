## Description
The purpose of this application is to add support for multiple annotation formats for CVAT.
It allows to download and upload annotations in different formats and easily add support for new.


## Ideas for improvements
* Annotation format manager like DL Model manager with which the user can add custom format support by writing dumper/paser scripts.
* Often a custom parser/dumper requires additional python packages and it would be useful if CVAT provided some API that allows the user to install a python dependencies from their own code without changing the source code. Possible solutions: install additional modules via pip call to a separate directory for each Annotation Format to reduce version conflicts, etc. Thus, custom code can be run in an extended environment, and core CVAT modules should not be affected. As well, this functionality can be useful for Auto Annotation module.
