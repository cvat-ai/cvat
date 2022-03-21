---
title: 'Attach cloud storage'
linkTitle: 'Attach cloud storage'
weight: 21
description: 'Instructions on how to attach cloud storage using UI'
---

In CVAT you can use [AWS-S3](using-aws-s3), [Azure Blob Container](#using-azure-blob-container)
and [Google cloud](#using-google-cloud-storage) storages to store image datasets for your tasks.

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

#### Prepare dataset

For example, let's take [The Oxford-IIIT Pet Dataset](https://www.robots.ox.ac.uk/~vgg/data/pets/):

- Download the [archive with images](https://www.robots.ox.ac.uk/~vgg/data/pets/data/images.tar.gz).
- Unpack the archive into the prepared folder
  and create a manifest file as described in [prepare manifest file section](/docs/manual/advanced/dataset_manifest/):

  ```bash
  python <cvat repository>/utils/dataset_manifest/create.py --output-dir <yourfolder> <yourfolder>
  ```

#### Upload

- When the manifest file is ready, open the previously prepared bucket and click `Upload`:

  ![](/images/aws-s3_tutorial_5.jpg)

- Drag the manifest file and image folder on the page and click `Upload`:

  ![](/images/aws-s3_tutorial_1.gif)

Now you can [attach new cloud storage into CVAT](#attach-new-cloud-storage).

## Using Azure Blob Container

### Create Microsoft account

First, create a Microsoft account by [registering](https://signup.live.com/signup?ru=https://login.live.com/),
or you can use your GitHub account to log in. After signing up for Azure, you'll need to choose a subscription plan,
you can choose a free 12-month subscription, but you'll need to enter your credit card details to verify your identity.
To learn more about Azure, read [documentation](https://docs.microsoft.com/en-us/azure/).

### Create a storage account

After registration, go to [Azure portal](https://portal.azure.com/#home).
Hover over the resource groups and click `create` in the window that appears.

![](/images/azure_blob_container_tutorial1.jpg)

Enter a name for the group and click `review + create`, check the entered data and click `create`.
After the resource group is created,
go to the [resource groups page](https://portal.azure.com/#blade/HubsExtension/BrowseResourceGroups)
and navigate to the resource group that you created.
Click `create` for create a storage account.

![](/images/azure_blob_container_tutorial2.jpg)

- **Basics**

  Enter `storage account name` (will be used in CVAT to access your container), select a `region`,
  select `performance` in our case will be `standard` enough, select `redundancy` enough `LRS`
  [more about redundancy](https://docs.microsoft.com/en-us/azure/storage/common/storage-redundancy).
  Click `next` to go to the advanced section.

  ![](/images/azure_blob_container_tutorial4.jpg)

- **Advanced**

  In the advanced section, you can change public access by disabling `enable blob public access`
  to deny anonymous access to the container.
  If you want to change public access you can find this switch in the `configuration` section of your storage account.

  After that, go to the review section, check the entered data and click `create`.

  ![](/images/azure_blob_container_tutorial5.jpg)

You will be reached to the deployment page after the finished,
navigate to the resource by clicking on `go to resource`.

![](/images/azure_blob_container_tutorial6.jpg)

### Create a container

Go to the containers section and create a new container. Enter the `name` of the container
(will be used in CVAT to access your container) and select `container` in `public access level`.

![](/images/azure_blob_container_tutorial7.jpg)

### SAS token

Using the `SAS token`, you can securely transfer access to the container to other people by preconfiguring rights,
as well as the date/time of the starting and expiration of the token.
To generate a SAS token, go to `Shared access signature` section of your storage account.
Here you should enable `Blob` in the `Allowed services`, `Container` and `Object` in the `Allowed resource types`,
`Read` and `List` in the `Allowed permissions`, `HTTPS and HTTP` in the `Allowed protocols`,
also here you can set the date/time of the starting and expiration for the token. Click `Generation SAS token`.
and copy `SAS token` (will be used in CVAT to access your container).

![](/images/azure_blob_container_tutorial3.jpg)

For personal use, you can enter the `Access Key` from the your storage account in the `SAS Token` field,
`access key` can be found in the `security + networking` section.
Click `show keys` to show the key.

![](/images/azure_blob_container_tutorial8.jpg)

### Upload dataset

Prepare the dataset as in the point [prepare dataset](#prepare-dataset).

- When the dataset is ready, go to your container and click `upload`.
- Click `select a files` and select all images from the images folder
  in the `upload to folder` item write the name of the folder in which you want to upload images in this case "images".

  ![](/images/azure_blob_container_tutorial9.jpg)

- Click `upload`, when the images are loaded you will need to upload a manifest file. When loading a manifest, you
  need to make sure that the relative paths specified in the manifest file match the paths
  to the files in the container. Click `select a file` and select manifest file, in order to upload file to the root
  of the container leave blank `upload to folder` field.

Now you can [attach new cloud storage into CVAT](#attach-new-cloud-storage).

## Using Google Cloud Storage

### Create Google account

First, create a Google account, go to [account login page](https://accounts.google.com/) and click `Create account`.
After, go to the [Google Cloud page](https://cloud.google.com), click `Get started`, enter the required data
and accept the terms of service (you'll need credit card information to register).

### Create a bucket

Your first project will be created automatically, you can see it on the [cloud resource manager page](https://console.cloud.google.com/cloud-resource-manager).
To create a bucket, go to the [cloud storage page](https://console.cloud.google.com/storage/browser)
and press `Create bucket`. Next, enter the name of the bucket, add labels if necessary, select the type of location
for example region and the location nearest to you, select storage class, when selecting access control
you can enable `Enforce public access prevention on this bucket` (if you plan to have anonymous access to your bucket,
it should be disabled) you can select `Uniform` or `Fine-grained` access control, if you need protection of your
object data select protect object data type. When all the information is entered click `Create` to create the bucket.

![](/images/google_cloud_storage_tutorial1.jpg)

### Upload

Prepare the dataset as in the point [prepare dataset](#prepare-dataset).

To upload files, you can simply drag and drop files and folders into a browser window
or use the `upload folder` and/or `upload files`.

### Access permissions

To access Google Cloud Storage from CVAT you will need a `Project ID`
you can find it by going to [cloud resource manager page](https://console.cloud.google.com/cloud-resource-manager)

![](/images/google_cloud_storage_tutorial5.jpg)

#### Create a service account and key file

To access your bucket you need a key file and a service account. To create a service account,
go to `IAM & Admin`/`Service Accounts` and press `Create Service Account`. Enter your account
name and click `Create And Continue`. Select a role for example `Basic`/`Viewer`.
Next, you can give access rights to the service account, to complete click `Done`.

![](/images/google_cloud_storage_tutorial2.jpg)

The account you created will appear in the service accounts list, open it and go to the `Keys` tab.
To create a key, click `ADD` and select `Create new key`, next you need to choose the key type `JSON` and select `Create`.
The key file will be downloaded automatically.

![](/images/google_cloud_storage_tutorial3.jpg)

[Learn more about creating keys](https://cloud.google.com/docs/authentication/getting-started).

#### Anonymous access

To configure anonymous access, open your bucket and go to the permissions tab click `ADD` to add new principals.
In `new principals` field specify `allUsers`, select role for example `Cloud Storage Legacy`/`Storage Legacy Bucket Reader`
and press `SAVE`.

![](/images/google_cloud_storage_tutorial4.jpg)

Now you can attach new cloud storage into CVAT.

## Attach new cloud storage

After you upload the dataset and manifest file to AWS-S3, Azure Blob Container or Google Cloud Storage
you will be able to attach a cloud storage. To do this, press the `+` button on the `Cloud storages` page
and fill out the following form:

![](/images/image228.jpg)

- `Display name` - the display name of the cloud storage.
- `Description` (optional) - description of the cloud storage, appears when you click on the `?` button
  of an item on cloud storages page.
- `Provider` - choose provider of the cloud storage:

  - [**AWS-S3**](#using-aws-s3):

    - [`Bucket`](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingBucket) - cloud storage bucket name.

    - [`Authorization type`](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-best-practices.html):

      - `Key id and secret access key pair` - available on [IAM](https://console.aws.amazon.com/iamv2/home?#/users)
        to obtain an access key and a secret key, create a user using IAM and grant the appropriate rights [learn more](#create-user-and-configure-permissions).

        - `ACCESS KEY ID`
        - `SECRET ACCESS KEY ID`

      - `Anonymous access` - for anonymous access, you need to enable public access to bucket.

    - `Region` - here you can choose a region from the list or add a new one. To get more information click
      on [`?`](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions).

    </br>

  - [**Azure Blob Container**](https://docs.microsoft.com/en-us/azure/storage/blobs/):

    - `Container name` - name of the cloud storage container.

      - `Authorization type`:

        - [`Account name and SAS token`](https://docs.microsoft.com/en-us/azure/cognitive-services/translator/document-translation/create-sas-tokens?tabs=blobs):

          - `Account name` - storage account name.
          - `SAS token` - is located in the `Shared access signature` section of your `Storage account` [learn more](#sas-token).

        - [`Anonymous access`](https://docs.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-configure?tabs=portal) -
          for anonymous access `enable blob public access` in the `configuration` section of your storage account.
          in this case, you only need the storage account name to gain anonymous access.
          - `Account name` - storage account name.

    </br>

  - [**Google Cloud**](https://cloud.google.com/docs):

    - [`Bucket name`](https://cloud.google.com/storage/docs/creating-buckets) - cloud storage bucket name,
      you can find the created bucket on the [storage browser page](https://console.cloud.google.com/storage/browser).

    - `Authorization type`:

      - [`Key file`](#create-a-service-account-and-key-file) - you can drag a key file to the area `attach a file`
        or click on the area to select the key file through the explorer. If the environment variable
        `GOOGLE_APPLICATION_CREDENTIALS` is specified for an environment with a deployed CVAT instance, then it will
        be used if you do not attach the key file
        ([more about `GOOGLE_APPLICATION_CREDENTIALS`](https://cloud.google.com/docs/authentication/getting-started#setting_the_environment_variable)).

      - [`Anonymous access`](#anonymous-access) - for anonymous access, you need to enable public access to bucket.

    - `Prefix` - used to filter data from the bucket.

    - [`Project ID`](https://cloud.google.com/resource-manager/docs/creating-managing-projects) - you can find
      the created project on the [cloud resource manager page](https://console.cloud.google.com/cloud-resource-manager),
      note that the project name does not match the project ID.

    - `Location` - here you can choose a region from the list or add a new one. To get more information click
      on [`?`](https://cloud.google.com/storage/docs/locations#available-locations).

    </br>

- `Manifest` - the path to the manifest file on your cloud storage.
  You can add multiple manifest files using the `Add manifest` button.
  You can find on how to prepare dataset manifest [`here`](/docs/manual/advanced/dataset_manifest/).
  If you have data on the cloud storage and don't want to download content locally, you can mount your
  cloud storage as a share point according to [`that guide`](/docs/administration/advanced/mounting_cloud_storages/)
  and prepare manifest for the data.

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

```bash
aws configure
Access Key ID: <your Access Key ID>
Secret Access Key: <your Secret Access Key>
```

Copy the content of the bucket to a folder on your computer:

```bash
aws s3 cp <s3://bucket-name> <yourfolder> --recursive
```

After copying the files, you can create a manifest file as described in [preapair manifest file section](/docs/manual/advanced/dataset_manifest/):

```bash
python <cvat repository>/utils/dataset_manifest/create.py --output-dir <yourfolder> <yourfolder>
```

When the manifest file is ready, you can upload it to aws s3 bucket. If you gave full write permissions
when you created the user, run:

```bash
aws s3 cp <yourfolder>/manifest.jsonl <s3://bucket-name>
```

If you have given read-only permissions, use the download through the browser, click upload,
drag the manifest file to the page and click upload.

![](/images/aws-s3_tutorial_5.jpg)

Now you can [attach new cloud storage](#attach-new-cloud-storage) using the dataset `500 Image & Metadata Free Sample`.
