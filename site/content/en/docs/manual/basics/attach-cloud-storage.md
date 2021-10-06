---
title: 'Attach cloud storage'
linkTitle: 'Attach cloud storage'
weight: 21
description: 'Instructions on how to attach cloud storage using UI'
---

In CVAT you can use AWS-S3 and Azure Blob Container cloud storages to store image datasets for your tasks.

## Using AWS-S3

### Create AWS account

First, you need to create an AWS account, to do this, [register of 5 steps](https://portal.aws.amazon.com/billing/signup#/start)
following the instructions
(even if you plan to use a free basic account you may need to link a credit card to verify your identity).

To learn more about the operation and benefits of AWS cloud,
take a free [AWS Cloud Practitioner Essentials](https://www.aws.training/Details/eLearning?id=60697) course,
which will be available after registration.

### Create a bucket

After the account is created, go to [console AWS-S3](https://s3.console.aws.amazon.com/s3/home)
and click `Create bucket`.

![](/images/aws-s3_tutorial_1.jpg)

You'll be taken to the bucket creation page. Here you have to specify the name of the bucket, region,
optionally you can copy the settings of another bucket by clicking on the `choose bucket` button.
Checkbox block all public access can be enabled as we will use `access key ID` and `secret access key` to gain access.
In the following sections, you can leave the default settings and click `create bucket`.
After you create the bucket it will appear in the list of buckets.

### Create user and configure permissions

To access bucket you will need to create a user, to do this, go [IAM](https://console.aws.amazon.com/iamv2/home#/users)
and click `add users`. You need to choose AWS access type, have an access key ID and secret access key.

![](/images/aws-s3_tutorial_2.jpg)

After pressing `next` button to configure permissions, you need to create a user group.
To do this click `create a group`, input the `group name` and select permission policies add `AmazonS3ReadOnlyAccess`
using the search (if you want the user you create to have write rights to bucket select `AmazonS3FullAccess`).

![](/images/aws-s3_tutorial_3.jpg)

You can also add tags for the user (optional), and look again at the entered data. In the last step of creating a user,
you will be provided with `access key ID` and `secret access key`,
they will need to be used in CVAT when adding cloud storage.

![](/images/aws-s3_tutorial_4.jpg)

### Upload dataset

For example, let's take [The Oxford-IIIT Pet Dataset](https://www.robots.ox.ac.uk/~vgg/data/pets/):
- Download the [archive with images](https://www.robots.ox.ac.uk/~vgg/data/pets/data/images.tar.gz).
- Unpack the archive into the prepared folder
  and create a manifest file as described in [prepare manifest file section](/docs/manual/advanced/dataset_manifest/):
  ```
  python <cvat repository>/utils/dataset_manifest/create.py --output-dir <yourfolder> <yourfolder>
  ```
- When the manifest file is ready, open the previously prepared bucket and click `Upload`:

  ![](/images/aws-s3_tutorial_5.jpg)

- Drag the manifest file and image folder on the page and click `Upload`:

  ![](/images/aws-s3_tutorial_1.gif)

## Attach new cloud storage

After you upload the dataset and manifest file to AWS-S3 or Azure Blob Container
you will be able to attach a cloud storage. To do this, press the `Attach new cloud storage`
button on the `Cloud storages` page and fill out the following form:

![](/images/image228.jpg)

- `Display name` - the display name of the cloud storage.
- `Description` (optional) - description of the cloud storage, appears when you click on the `?` button
of an item on cloud storages page.
- `Provider` - choose provider of the cloud storage:

  - [AWS-S3](#using-aws-s3):

    - [`Bucket`](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingBucket) - cloud storage bucket name

    - [`Authorization type`](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-best-practices.html):

      - `Key id and secret access key pair` - available on [IAM](https://console.aws.amazon.com/iamv2/home?#/users)
        - `ACCESS KEY ID`
        - `SECRET ACCESS KEY ID`

      - `Anonymous access` - For anonymous access, you need to enable public access to bucket

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

## Using AWS Data Exchange

### Subscribe to data set

You can use AWS Data Exchange to add image datasets.
For example, consider adding a set of datasets `500 Image & Metadata Free Sample`.
Go to [browse catalog](https://console.aws.amazon.com/dataexchange) and use the search to find
`500 Image & Metadata Free Sample`, open the dataset page and click `continue to subscribe`,
you will be taken to the page complete subscription request, read the information provided
and click send subscription request to provider.

![](/images/aws-s3_tutorial_6.jpg)

### Export to bucket

After that, this dataset will appear in the
[list subscriptions](https://console.aws.amazon.com/dataexchange/home/subscriptions#/subscriptions).
Now you need to export the dataset to `Amazon S3`.
First, let's create a new one bucket similar to [described above](#create-a-bucket).
To export one of the datasets to a new bucket open it `entitled data` select one of the datasets,
select the corresponding revision and click export to Amazon S3
(please note that if bucket and dataset are located in different regions, export fees may apply).
In the window that appears, select the created bucket and click export.

![](/images/aws-s3_tutorial_7.jpg)

### Prepare manifest file
Now you need to prepare a manifest file. I used [AWS cli](https://aws.amazon.com/cli/) and
[script for prepare manifest file](https://github.com/openvinotoolkit/cvat/tree/develop/utils/dataset_manifest).
Perform the installation using the manual [aws-shell](https://github.com/awslabs/aws-shell),
I used `aws-cli 1.20.49` `Python 3.7.9` `Windows 10`.
You can configure credentials by running `aws configure`.
You will need to enter `Access Key ID` and `Secret Access Key` as well as region.

```
aws configure
Access Key ID: <your Access Key ID>
Secret Access Key: <your Secret Access Key>
```

Copy the content of the bucket to a folder on your computer:

```
aws s3 cp <s3://bucket-name> <yourfolder> --recursive
```

After copying the files, you can create a manifest file as described in [preapair manifest file section](/docs/manual/advanced/dataset_manifest/):

```
python <cvat repository>/utils/dataset_manifest/create.py --output-dir <yourfolder> <yourfolder>
```

When the manifest file is ready, you can upload it to aws s3 bucket. If you gave full write permissions
when you created the user, run:

```
aws s3 cp <yourfolder>/manifest.jsonl <s3://bucket-name>
```

If you have given read-only permissions, use the download through the browser, click upload,
drag the manifest file to the page and click upload.

![](/images/aws-s3_tutorial_5.jpg)

Now you can [attach new cloud storage](#attach-new-cloud-storage) using the dataset `500 Image & Metadata Free Sample`.
