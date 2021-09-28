---
title: 'Attach cloud storage'
linkTitle: 'Attach cloud storage'
weight: 21
description: 'Instructions on how to attach cloud storage using UI'
---

In CVAT you can use AWS-S3 and Azure Blob Container cloud storages to store image datasets for your tasks.
Initially you need to create a manifest file for your image dataset. Information on how to do that is available
on the [Simple command line to prepare dataset manifest file](/docs/manual/advanced/dataset_manifest) page.

After the manifest file has been created, you can upload it and your dataset to an AWS-S3 or
Azure Blob Container cloud storage.

After that you will be able to attach a cloud storage. To do this, press the `Attach new cloud storage`
button on the `Cloud storages` page and fill out the following form:

![](/images/image228.jpg)

- `Display name` - the display name of the cloud storage.
- `Description` (optional) - description of the cloud storage, appears when you click on the `?` button
of an item on cloud storages page.
- `Provider` - choose provider of the cloud storage:

  - [AWS-S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/GetStartedWithS3.html):

    - `Bucket` - cloud storage bucket name

    - [`Authorization type`](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-best-practices.html):

      - `Key id and secret access key pair`:
        - `ACCESS KEY ID`
        - `SECRET ACCESS KEY ID`

      - `Anonymous access`

    - `Region` - here you can choose a region from the list or add a new one. To get more information click
    on [`?`](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions)

    </br>

  - [Azure Blob Container](https://docs.microsoft.com/en-us/azure/storage/blobs/):

    - `Container name` - name of the cloud storage container

      - `Authorization type`:

        - [`Account name and SAS token`](https://docs.microsoft.com/en-us/azure/cognitive-services/translator/document-translation/create-sas-tokens?tabs=blobs):

          - `Account name`
          - `SAS token`

        - [`Anonymous access`](https://docs.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-configure?tabs=portal)
          - `Account name`

    </br>
- `Manifest` - the path to the manifest file on your cloud storage.
You can add multiple file manifests using the `Add manifest` button.
For more information click on [`?`](/docs/manual/advanced/dataset_manifest/).

To publish the cloud storage, click `submit`, after which it will be available on
the [Cloud storages page](/docs/manual/basics/cloud-storages/).
