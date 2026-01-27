---
title: 'Attach cloud storage'
linkTitle: 'Attach cloud storage'
weight: 6
description: 'Instructions on how to attach cloud storage using UI'
aliases:
  - /docs/manual/basics/attach-cloud-storage/
---

In CVAT, you can use **Amazon S3**, **Azure Blob Storage**, **Backblaze B2**,
and **Google Cloud Storage** storages to import and export image datasets for your tasks.

Check out:

- [Amazon S3](#amazon-s3)
  - [Create a bucket](#create-a-bucket)
  - [Upload data](#upload-data)
  - [Access permissions](#access-permissions)
    - [Authenticated access](#authenticated-access)
    - [Anonymous access](#anonymous-access)
  - [Attach Amazon S3 storage](#attach-aws-s3-storage)
  - [Amazon S3 manifest file](#aws-s3-manifest-file)
  - [Video tutorial: Add Amazon S3 as Cloud Storage in CVAT](#video-tutorial-add-aws-s3-as-cloud-storage-in-cvat)
- [Backblaze B2](#backblaze-b2)
  - [Create a bucket](#create-a-bucket-b2)
  - [Upload data](#upload-data-b2)
  - [Access permissions](#access-permissions-b2)
  - [Attach Backblaze B2 storage](#attach-backblaze-b2-storage)
- [Google Cloud Storage](#google-cloud-storage)
  - [Create a bucket](#create-a-bucket-1)
  - [Upload data](#upload-data-1)
  - [Access permissions](#access-permissions-1)
    - [Authenticated access](#authenticated-access-1)
    - [Anonymous access](#anonymous-access-1)
  - [Attach Google Cloud Storage](#attach-google-cloud-storage)
  - [Video tutorial: Add Google Cloud Storage as Cloud Storage in CVAT](#video-tutorial-add-google-cloud-storage-as-cloud-storage-in-cvat)
- [Microsoft Azure Blob Storage](#microsoft-azure-blob-storage)
  - [Create a bucket](#create-a-bucket-2)
  - [Create a container](#create-a-container)
  - [Upload data](#upload-data-2)
  - [SAS token and connection string](#sas-token-and-connection-string)
  - [Personal use](#personal-use)
  - [Attach Azure Blob Storage](#attach-azure-blob-storage)
  - [Video tutorial: Add Microsoft Azure Blob Storage as Cloud Storage in CVAT](#video-tutorial-add-microsoft-azure-blob-storage-as-cloud-storage-in-cvat)
- [Prepare the dataset](#prepare-the-dataset)

## Amazon S3

### Create a bucket

To create bucket, do the following:

1. Create an [AWS account](https://portal.aws.amazon.com/billing/signup#/start).
1. Go to the [Amazon S3 console](https://s3.console.aws.amazon.com/s3/home), and select **Create bucket**.

   ![Amazon S3 interface with highlighted "Create bucket" button](/images/aws-s3_tutorial_1.jpg)

1. Specify the name and region of the bucket. You can also
   copy the settings of another bucket by selecting **Choose bucket**.
1. Enable **Block all public access**. For access, you will use **access key ID** and **secret access key**.
1. Select **Create bucket**.

A new bucket will appear on the list of buckets.

### Upload data

{{% alert title="Note" color="primary" %}}
The manifest file is optional.
{{% /alert %}}

You need to upload data for annotation and the `manifest.jsonl` file.

1. Prepare data.
   For more information,
   refer on how to [prepare the dataset](#prepare-the-dataset).
1. Open the bucket and select **Upload**.

   ![Amazon S3 interface with highlighted "Upload"](/images/aws-s3_tutorial_5.jpg)

1. Drag the manifest file and image folder on the page and select **Upload**:

![Uploading data to Amazon S3](/images/aws-s3_tutorial_1.gif)

### Access permissions

#### Authenticated access

To add access permissions, do the following:

1. Go to [IAM](https://console.aws.amazon.com/iamv2/home#/users) and select **Add users**.
1. Set **User name** and enable **Access key - programmatic access**.

   ![Amazon S3 interface with highlighted "User name" and "Access key - programmatic access" parameters](/images/aws-s3_tutorial_2.jpg)

1. Select **Next: Permissions**.
1. Select **Create group**, enter the group name.
1. Use search to find and select:

   - For read-only access: **AmazonS3ReadOnlyAccess**.
   - For full access: **AmazonS3FullAccess**.

   ![Amazon S3 interface with creating user group step](/images/aws-s3_tutorial_3.jpg)

1. (Optional) Add tags for the user and go to the next page.
1. Save **Access key ID** and **Secret access key**.

![Amazon S3 interface with saving access credentials step](/images/aws-s3_tutorial_4.jpg)

For more information,
consult [Creating an IAM user in your AWS account](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html)

#### Anonymous access

On how to grant public access to the
bucket, consult
[Configuring block public access settings for your S3 buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/configuring-block-public-access-bucket.html)

### Attach Amazon S3 storage

To attach storage, do the following:

1. Log into CVAT and in the separate tab
   open your bucket page.
1. In the CVAT, on the top menu select **Cloud storages** > on the opened page select **+**.

Fill in the following fields:

| CVAT                    | Amazon S3 |
| ----------------------- | --------- |
| **Display name**        | Preferred display name for your storage. |
| **Description**         | (Optional) Add description of storage. |
| **Provider**            | From drop-down list select **Amazon S3**. |
| **Bucket name**         | Name of the [Bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingBucket). |
| **Authentication type** | Depends on the bucket setup: <br><li>**Key id and secret access key pair**: available on [IAM](https://console.aws.amazon.com/iamv2/home?#/users). <br><li>**Anonymous access**: for anonymous access. Public access to the bucket must be enabled. |
| **Region**              | (Optional) Choose a region from the list or add a new one. For more information, consult [**Available locations**](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions). |
| **Prefix**              | (Optional) Prefix is used to filter bucket content. By setting a default prefix, you ensure that only data from a specific folder in the cloud is used in CVAT. This will affect which files you see when creating a task with cloud data. |
| **Manifests**           | (Optional) Select **+ Add manifest** and enter the name of the manifest file with an extension. For example: `manifest.jsonl`. |

After filling in all the fields, select **Submit**.

### Amazon S3 manifest file

{{% alert title="Note" color="primary" %}}
The manifest file is optional.
{{% /alert %}}

To prepare the manifest file, do the following:

1. Go to [**AWS CLI**](https://aws.amazon.com/cli/) and run
   [script for prepare manifest file](https://github.com/cvat-ai/cvat/tree/develop/utils/dataset_manifest).
1. Perform the installation, following the [**aws-shell manual**](https://github.com/awslabs/aws-shell),
   <br>You can configure credentials by running `aws configure`.
   <br>You will need to enter `Access Key ID` and `Secret Access Key` as well as the region.

   ```bash
   aws configure
   Access Key ID: <your Access Key ID>
   Secret Access Key: <your Secret Access Key>
   ```

1. Copy the content of the bucket to a folder on your computer:

   ```bash
   aws s3 cp <s3://bucket-name> <yourfolder> --recursive
   ```

1. After copying the files, you can create a manifest file as described in
   {{< ilink "/docs/dataset_management/dataset_manifest" "prepare manifest file section" >}}:

   ```bash
   python <cvat repository>/utils/dataset_manifest/create.py --output-dir <yourfolder> <yourfolder>
   ```

1. When the manifest file is ready, upload it to the S3 bucket:

   - For read and write permissions when you created the user, run:

     ```bash
     aws s3 cp <yourfolder>/manifest.jsonl <s3://bucket-name>
     ```

   - For read-only permissions, use the download through the browser,
     select upload, drag the manifest file to the page and select upload.

     ![Amazon S3 interface with highlighted "Upload"](/images/aws-s3_tutorial_5.jpg)

### Video tutorial: Add Amazon S3 as Cloud Storage in CVAT

<iframe width="560" height="315" src="https://www.youtube.com/embed/y6fgZ4X87Lc?si=5EewLS4XA7birS25" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

## Backblaze B2

Backblaze B2 is an S3-compatible cloud storage service.
It can be used in CVAT by selecting **Amazon S3** as the provider
and specifying the Backblaze B2 endpoint (for example, <https://s3.us-west-004.backblazeb2.com>).

### <a name="create-a-bucket-b2">Create a bucket</a>

To create a B2 bucket, do the following:

1. Create a [Backblaze account](https://www.backblaze.com/sign-up/cloud-storage) or log into an existing one.
1. In the Backblaze console, go to **B2 Cloud Storage** > **Buckets**.
1. Select **Create a Bucket**.
1. Configure your bucket:
   - **Bucket Unique Name**: Enter a globally unique name for your bucket.
   - **Files in Bucket**: Select **Private** for secure access or **Public** for anonymous access.
   - **Default Encryption**: (Optional) Enable server-side encryption for added security.
   - **Object Lock**: (Optional) Enable if you need compliance features.
1. Select **Create a Bucket**.

The new bucket will appear in your buckets list.

### <a name="upload-data-b2">Upload data</a>

{{% alert title="Note" color="primary" %}}
The manifest file is optional.
{{% /alert %}}

You need to upload data for annotation and optionally the `manifest.jsonl` file.

1. Prepare data.
   For more information,
   refer on how to [prepare the dataset](#prepare-the-dataset).
1. Open the bucket and select **Upload/Download**.
1. Drag and drop files or folders, or select **Browse files** to upload your data.

Alternatively, you can use the [Backblaze CLI](https://www.backblaze.com/docs/cloud-storage-command-line-tools)
or any S3-compatible tool like the AWS CLI with B2 endpoints.

### <a name="access-permissions-b2">Access permissions</a>

To access your B2 bucket from CVAT, you need to create Application Keys:

1. In the Backblaze console, go to **App Keys**.
1. Select **Add a New Application Key**.
1. Configure the key:
   - **Name of Key**: Enter a descriptive name (e.g., "CVAT Access").
   - **Allow access to Bucket(s)**: Select the specific bucket you created, or choose **All** for access to all buckets.
   - **Type of Access**: Select **Read and Write** for full access, or **Read Only** if you only need to import data.
   - **Allow List All Bucket Names**: Enable if you want to list all buckets.
   - **File name prefix**: (Optional) Restrict access to specific file prefixes.
   - **Duration**: (Optional) Set an expiration time for the key.
1. Select **Create New Key**.
1. **Important**: Save the **keyID** and **applicationKey** immediately.
   The **applicationKey** is only shown once and cannot be retrieved later.

{{% alert title="Warning" color="warning" %}}
Store your **applicationKey** securely. It will only be displayed once
during creation and cannot be recovered later.
{{% /alert %}}

For more information, consult
[B2 Application Keys](https://www.backblaze.com/docs/cloud-storage-application-keys).

### Attach Backblaze B2 storage

To attach B2 storage to CVAT, do the following:

1. Log into CVAT.
1. In CVAT, on the top menu select **Cloud storages** > on the opened page select **+**.

Fill in the following fields:

| **CVAT field**          | **Backblaze B2 value** |
| ------------------------ | ---------------------- |
| **Display name**         | Preferred display name for your storage. |
| **Description**          | (Optional) Add a description of the storage. |
| **Provider**             | From the drop-down list, select **Amazon S3** (Backblaze B2 is S3-compatible). |
| **Bucket name**          | Name of your B2 bucket. |
| **Authentication type**  | Select **Key ID and secret access key pair**. |
| **Access key ID**        | Enter the **keyID** from your [B2 Application Key](#access-permissions-b2). |
| **Secret access key**    | Enter the **applicationKey** from your [B2 Application Key](#access-permissions-b2). |
| **Endpoint URL**         | **Required for B2**: Enter your B2 S3 endpoint URL (for example, `https://s3.us-west-004.backblazeb2.com`). You can find the endpoint in your bucket details page. |
| **Prefix**               | (Optional) Use to limit CVAT to a specific folder within the bucket. |
| **Manifests**            | (Optional) Select **+ Add manifest** and specify a manifest file name such as `manifest.jsonl`. |

{{% alert title="Important" color="primary" %}}
When using Backblaze B2, you **must** specify the **Endpoint URL** field
with your B2 S3-compatible endpoint (e.g., `https://s3.us-west-004.backblazeb2.com`).
This tells CVAT to connect to Backblaze instead of Amazon S3.
{{% /alert %}}

After filling in all the fields, select **Submit**.

## Google Cloud Storage

### Create a bucket

To create bucket, do the following:

1. Create [Google account](https://support.google.com/accounts/answer/27441?hl=en) and log into it.
1. On the [Google Cloud](https://cloud.google.com/) page, select **Start Free**, then enter the required
   data and accept the terms of service.

   {{% alert title="Note" color="primary" %}}
   Google requires to add payment, you will need a bank card to accomplish step 2.
   {{% /alert %}}

1. [Create a Bucket](https://cloud.google.com/storage/docs/creating-buckets) with the following parameters:
   - **Name your bucket**: Unique name.
   - **Choose where to store your data**: Set up a location nearest to you.
   - **Choose a storage class for your data**: `Set a default class` > `Standard`.
   - **Choose how to control access to objects**: `Enforce public access prevention on this bucket` >
     `Uniform` (default).
   - **How to protect data**: `None`

![GB](/images/google_bucket.png)

You will be forwarded to the bucket.

### Upload data

{{% alert title="Note" color="primary" %}}
The manifest file is optional.
{{% /alert %}}

You need to upload data for annotation and the `manifest.jsonl` file.

1. Prepare data.
   For more information,
   consult [prepare the dataset](#prepare-the-dataset).
1. Open the bucket and from the top menu
   select **Upload files** or **Upload folder**
   (depends on how your files are organized).

### Access permissions

To access Google Cloud Storage get a **Project ID**
from [cloud resource manager page](https://console.cloud.google.com/cloud-resource-manager)

![Project ID shown in Google Cloud Storage interface](/images/google_cloud_storage_tutorial5.jpg)

And follow instructions below based on the preferable type of access.

#### Authenticated access

For authenticated access you need to create a service account and key file.

To create a service account:

1. On the Google Cloud platform, go to **IAM & Admin** > **Service Accounts** and select **+Create Service Account**.
1. Enter your account name and select **Create And Continue**.
1. Select a role, for example **Basic** > **Viewer**, and select **Continue**.
1. (Optional) Give access rights to the service account.
1. Select **Done**.

![Creating service account shown in Google Cloud Storage interface](/images/google_cloud_storage_tutorial2.jpg)

To create a key:

1. Go to **IAM & Admin** > **Service Accounts** > select on account name > **Keys**.
1. Select **Add key** and select **Create new key** > **JSON**
1. Select **Create**. The key file will be downloaded automatically.

![Google Cloud Storage interface with highlighted steps to create a key](/images/google_cloud_storage_tutorial3.jpg)

For more information about keys, consult
[Learn more about creating keys](https://cloud.google.com/docs/authentication/getting-started).

#### Anonymous access

To configure anonymous access:

1. Open the bucket and go to the **Permissions** tab.
1. Click **+ Grant access** to add new principals.
1. In the **New principals** field specify `allUsers`,
   select roles: `Cloud Storage Legacy` > `Storage Legacy Bucket Reader`.
1. Select **Save**.

![Google Cloud Storage interface with anonymous access configuration](/images/google_cloud_storage_tutorial4.jpg)

Now you can attach the Google Cloud Storage bucket to CVAT.

### Attach Google Cloud Storage

To attach storage, do the following:

1. Log into CVAT and in the separate tab
   open your [bucket](https://console.cloud.google.com/storage/browser)
   page.
1. In the CVAT, on the top menu select **Cloud storages** > on the opened page select **+**.

Fill in the following fields:

| CVAT                    | Google Cloud Storage |
| ----------------------- | -------------------- |
| **Display name**        | Preferred display name for your storage. |
| **Description**         | (Optional) Add description of storage. |
| **Provider**            | From drop-down list select **Google Cloud Storage**. |
| **Bucket name**         | Name of the bucket. You can find it on the [storage browser page](https://console.cloud.google.com/storage/browser). |
| **Authentication type** | Depends on the bucket setup: <br><li>**Authenticated access**: Select **Key file** and upload the key file from computer. <br> **Advanced**: For self-hosted solution, if the key file was not attached, then environment variable `GOOGLE_APPLICATION_CREDENTIALS` that was specified for an environment will be used. For more information, consult [Authenticate to Cloud services using client libraries](https://cloud.google.com/docs/authentication/client-libraries#setting_the_environment_variable).<br><li> **Anonymous access**: for anonymous access. Public access to the bucket must be enabled. |
| **Prefix**              | (Optional) Used to filter data from the bucket. By setting a default prefix, you ensure that only data from a specific folder in the cloud is used in CVAT. This will affect which files you see when creating a task with cloud data. |
| **Project ID**          | [Project ID](#authenticated-access). <br>For more information, consult [projects page](https://cloud.google.com/resource-manager/docs/creating-managing-projects) and [cloud resource manager page](https://console.cloud.google.com/cloud-resource-manager). <br>**Note:** Project name does not match the project ID. |
| **Location**            | (Optional) Choose a region from the list or add a new one. For more information, consult [**Available locations**](https://cloud.google.com/storage/docs/locations#available-locations). |
| **Manifests**           | (Optional) Select **+ Add manifest** and enter the name of the manifest file with an extension. For example: `manifest.jsonl`. |

After filling in all the fields, select **Submit**.

### Video tutorial: Add Google Cloud Storage as Cloud Storage in CVAT

<iframe width="560" height="315" src="https://www.youtube.com/embed/pl2KZqJouvI?si=58sziJGbHHc-Mcom" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

## Microsoft Azure Blob Storage

### Create a bucket

To create bucket, do the following:

1. Create an [Microsoft Azure](https://azure.microsoft.com/en-us/free/) account and log into it.
1. Go to [Azure portal](https://portal.azure.com/#home), hover over the resource
   , and in the pop-up window select **Create**.

   ![Microsoft Azure interface with highlighted "Create" button](/images/azure_blob_container_tutorial1.jpg)

1. Enter a name for the group and select **Review + create**, check the entered data and select **Create**.
1. Go to the [resource groups page](https://portal.azure.com/#view/HubsExtension/BrowseResourceGroups),
   navigate to the group that you created and select **Create resources**.
1. On the marketplace page, use search to find **Storage account**.

   ![Microsoft Azure interface with highlighted "Storage account" button](/images/azure_blob_container_tutorial2.png)

1. Select on **Storage account** and on the next page select **Create**.
1. On the **Basics** tab, fill in the following fields:

   - **Storage account name**: to access container from CVAT.
   - Select a region closest to you.
   - Select **Performance** > **Standard**.
   - Select **Local-redundancy storage (LRS)**.
   - Select **next: Advanced>**.

   ![Microsoft Azure interface with basic settings for storage account](/images/azure_blob_container_tutorial4.jpg)

1. On the **Advanced** page, fill in the following fields:
   - (Optional) Disable **Allow enabling public access on containers** to prohibit anonymous access to the container.
   - Select **Next > Networking**.

   ![Microsoft Azure interface with advanced settings for storage account](/images/azure_blob_container_tutorial5.png)

1. On the **Networking** tab, fill in the following fields:

   - If you want to change public access, enable **Public access from all networks**.
   - Select **Next>Data protection**.

     > You do not need to change anything in other tabs until you need some specific setup.

1. Select **Review** and wait for the data to load.
1. Select **Create**. Deployment will start.
1. After deployment is over, select **Go to resource**.

![Microsoft Azure interface with highlighted "Go to resource" button](/images/azure_blob_container_tutorial6.jpg)

### Create a container

To create container, do the following:

1. Go to the containers section and on the top menu select **+Container**

   ![Microsoft Azure interface with highlighted "+Container" button](/images/azure_blob_container_tutorial7.jpg)

1. Enter the name of the container.
1. (Optional) In the **Public access level** drop-down, select type of the access.
   <br>**Note:** this field will inactive if you disabled **Allow enabling public access on containers**.
1. Select **Create**.

### Upload data

You need to upload data for annotation and the `manifest.jsonl` file.

1. Prepare data.
   For more information,
   refer on how to [prepare the dataset](#prepare-the-dataset).
1. Go to container and select **Upload**.
1. Select **Browse for files** and select images.

   {{% alert title="Note" color="primary" %}}
   If images are in folder, specify folder in the **Advanced settings** > **Upload to folder**.
   {{% /alert %}}

1. Select **Upload**.

![Microsoft Azure interface with highlighted "Upload" button and upload settings](/images/azure_blob_container_tutorial9.jpg)

### SAS token and connection string

Use the SAS token or connection string to grant secure access to the container.

To configure the credentials:

1. Go to **Home** > **Resource groups** > You resource name > Your storage account.
1. On the left menu, select **Shared access signature**.
1. Change the following fields:
   - **Allowed services**: Enable **Blob** . Disable all other fields.
   - **Allowed resource types**: Enable **Container** and **Object**. Disable all other fields.
   - **Allowed permissions**: Enable **Read**, **Write**, and **List**. Disable all other fields.
   - **Start and expiry date**: Set up start and expiry dates.
   - **Allowed protocols**: Select **HTTPS and HTTP**
   - Leave all other fields with default parameters.
1. Select **Generate SAS and connection string** and copy **SAS token** or **Connection string**.

![Microsoft Azure interface with highlighted "SAS token" field](/images/azure_blob_container_tutorial3.jpg)

### Personal use

For personal use, you can use the **Access Key**
from your storage account in the CVAT **SAS Token** field.

To get the **Access Key**:

1. In the Azure Portal, go to the **Security + networking** > **Access Keys**
1. Select **Show** and copy the key.

![Microsoft Azure interface with highlighted elements to get an access key](/images/azure_blob_container_tutorial8.jpg)

### Attach Azure Blob Storage

To attach storage, do the following:

1. Log into CVAT and in the separate tab
   open your bucket page.
1. In the CVAT, on the top menu select **Cloud storages** > on the opened page select **+**.

Fill in the following fields:

| CVAT                    | Azure |
| ----------------------- | ----- |
| **Display name**        | Preferred display name for your storage. |
| **Description**         | (Optional) Add description of storage. |
| **Provider**            | From drop-down list select **Azure Blob Storage**. |
| **Container name`**     | Name of the cloud storage container. |
| **Authentication type** | Depends on the container setup. <br>**[Account name and SAS token](https://docs.microsoft.com/en-us/azure/cognitive-services/translator/document-translation/create-sas-tokens?tabs=blobs)**: <ul><li>**Account name** enter storage account name. <li>**SAS token** is located in the **Shared access signature** section of your [Storage account](#sas-token).</ul>. **[Anonymous access](https://docs.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-configure?tabs=portal)**: for anonymous access **Allow enabling public access on containers** must be enabled. |
| **Prefix**              | (Optional) Used to filter data from the bucket. By setting a default prefix, you ensure that only data from a specific folder in the cloud is used in CVAT. This will affect which files you see when creating a task with cloud data. |
| **Manifests**           | (Optional) Select **+ Add manifest** and enter the name of the manifest file with an extension. For example: `manifest.jsonl`. |

After filling in all the fields, select **Submit**.

### Video tutorial: Add Microsoft Azure Blob Storage as Cloud Storage in CVAT

<iframe width="560" height="315" src="https://www.youtube.com/embed/nvrm8oFBKMY?si=v2z6Rjlc250niXPX" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

## Prepare the dataset

For example, the dataset is [The Oxford-IIIT Pet Dataset](https://www.robots.ox.ac.uk/~vgg/data/pets/):

1. Download the [archive with images](https://www.robots.ox.ac.uk/~vgg/data/pets/data/images.tar.gz).
1. Unpack the archive into the prepared folder.
1. Create a manifest. For more information, consult
   {{< ilink "/docs/dataset_management/dataset_manifest" "**Dataset manifest**" >}}:

```bash
python <cvat repository>/utils/dataset_manifest/create.py --output-dir <your_folder> <your_folder>
```
