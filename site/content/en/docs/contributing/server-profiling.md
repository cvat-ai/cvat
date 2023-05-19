---
title: 'Server Profiling'
linkTitle: 'Server Profiling'
weight: 10
description: 'Tutorial about how to profile the server'
---

Below you can find just quick overview of the
[Django Silk profiler](https://github.com/jazzband/django-silk).
Please read [Silk documentation](https://github.com/jazzband/django-silk/tree/master#features)
for more information about its features.

Silk is a live profiling and inspection tool for the Django framework.
Silk intercepts and stores HTTP requests and database queries before
presenting them in a user interface for further inspection:

![Silk Screenshot](https://raw.githubusercontent.com/jazzband/django-silk/master/screenshots/1.png)

Primary features:
- Request Inspection
- SQL Inspection
- Profiling of python code

Silk is available in the development configuration of CVAT server for
authenticated users: <http://localhost:3000/profiler/>.
