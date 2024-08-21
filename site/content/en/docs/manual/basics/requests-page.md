---
title: 'Requests page'
linkTitle: 'Requests page'
weight: 7
---

The Requests page allows users to track the status of data processing jobs such as exporting annotations
or importing datasets. Users can monitor progress, download results, and check for errors if they occur.

![Requests page](/images/requests_page.png)

## Requests List

On the Requests page, requests are displayed as cards. Each card contains the following details (if applicable):
- **Operation Name**
- **Resource Link**
- **Status of the Request**
- **Timestamps**:
  - **Enqueued Date**
  - **Started Date**
  - **Finished Date**
  - **Result Expiration Date**
- **Annotations Format**
- **Menu** to download the result or cancel a `Queued` job

> Currently supported operations include creating tasks, importing/exporting annotations and datasets, and backups.

## Statuses for Requests List

The following statuses are used to indicate the state of each request:

| Status        | Description                                                                 |
| --------------| --------------------------------------------------------------------------- |
| `In Progress` | The requested job is being executed. The progress percentage is shown.      |
| `Queued`      | The requested job is waiting to be picked up by a worker.                   |
| `Finished`    | The requested job is finished. Downloading the result is available.         |
| `Failed`      | The requested job cannot be executed due to an unexpected error. The error description is available. |
