# High-level design for lambda manager

## Overview

Users want to use AI to annotate data automatically and semi-automatically.
Thus it is necessary to have a way easily add new AI applications and run
them `online` or `synchronously` for semi-automatic methods and `offline` or
`asynchronously` for automatic methods for many images. A good example of
`online` methods can be deep extreme cut where you need to have an answer
mostly immediately. An example of `offline` methods can be a model from TF
object detection API.

## REST API

- GET    /api/v1/lambda/functions: get list of functions
- POST   /api/v1/lambda/functions: add one more function
- GET    /api/v1/lambda/functions/`<int:fid>`: get information about the function
- PUT    /api/v1/lambda/functions/`<int:fid>`: update/replace the function
- DELETE /api/v1/lambda/functions/`<int:fid>`: delete a function
- POST   /api/v1/lambda/requests: call a function
- GET    /api/v1/lambda/requests: get list of requests
- GET    /api/v1/lambda/requests/`<int:rid>`: get information about the request
- DELETE /api/v1/lambda/requests/`<int:rid>`: cancel the request
