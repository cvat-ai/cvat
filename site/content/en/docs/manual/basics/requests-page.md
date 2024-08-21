---
title: 'Requests page'
linkTitle: 'Requests page'
weight: 7
---

The requests page allows users to track the status of data processing jobs such as exporting annotations or importing datasets. Users can monitor progress, download results, and check errors if they occur.

![](/images/requests_page.png)

On the requests page there is a list of requests presented in the form of cards.
Each element contains (if applicable):
- Operation name
- Resource link
- Status of the request
- Timestamps:
  - Enqueued date
  - Started date
  - Finished date
  - Result expiration date
- Annotations format
- Menu to download result or cancel `queued` job

> Currently supported operations: Creating tasks, Import/Export of annotations and datasets, backups.

### Statuses for requests list

| Status         | Description                                 |
| -------------- | ------------------------------------------- |
| `In progress`  | The requested job is being executed, the progress percent is shown |
| `Queued`       | The requested job is waiting to be picked up by worker |
| `Finished`     | The requested job is finished, downloading the result is available |
| `Failed`       | The requested job cant be executed due to unexpected error. The error description is available |
