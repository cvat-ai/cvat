---
title: 'REST API guide'
linkTitle: 'REST API'
weight: 12
description: 'Instructions on how to interact with REST API and getting swagger documentation.'
---

To access swagger documentation you need to be authorized.

Automatically generated Swagger documentation for Django REST API is available
on `<cvat_origin>/api/swagger`(default: `localhost:8080/api/swagger`).

Swagger documentation is visible on allowed hosts, Update environment
variable in docker-compose.yml file with cvat hosted machine IP or domain
name. Example - `ALLOWED_HOSTS: 'localhost, 127.0.0.1'`.

Make a request to a resource stored on a server and the server will respond with the requested information.
The HTTP protocol is used to transport a data.
Requests are divided into groups:

- `auth` - user authentication queries
- `comments` - requests to post/delete comments to issues
- `issues` - update, delete and view problem comments
- `jobs` -requests to manage the job
- `lambda` - requests to work with lambda function
- `projects` - project management queries
- `reviews` -adding and removing the review of the job
- `server` - server information requests
- `tasks` - requests to manage tasks
- `users` -  user management queries

Besides it contains `Models`.
Models - the data type is described using a 
[schema object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#schemaObject).

Each group contains queries related to a different types of HTTP methods such as: `GET`, `POST`, `PATCH`, `DELETE`, etc.
Different methods are highlighted in different color. Each item has a name and description.
Clicking on an element opens a form with a name, description and settings input field or an example of json values.

To find out more, read [swagger specification](https://swagger.io/docs/specification/about/).

To try to send a request, click `Try it now `and type `Execute`.
You'll get a response in the form of [`Curl`](https://curl.se/), `Request URL` and `Server response`.
