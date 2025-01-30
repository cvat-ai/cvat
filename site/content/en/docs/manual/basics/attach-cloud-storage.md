---
title: 'Attach cloud storage'
linkTitle: 'Attach cloud storage'
weight: 23
description: 'Instructions on how to attach cloud storage using UI'
---

In CVAT you can use **AWS S3**, **Azure Blob Storage**
and **Google Cloud Storage** storages to import and export
image datasets for your tasks.

See:

- [AWS S3](#aws-s3)
  - [Create a bucket](#create-a-bucket)
  - [Upload data](#upload-data)
  - [Access permissions](#access-permissions)
    - [Authenticated access](#authenticated-access)
    - [Anonymous access](#anonymous-access)
  - [Attach AWS S3 storage](#attach-aws-s3-storage)
  - [AWS S3 manifest file](#aws-s3-manifest-file)
  - [Video tutorial: Add AWS S3 as Cloud Storage in CVAT](#video-tutorial-add-aws-s3-as-cloud-storage-in-cvat)
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

## AWS S3

### Create a bucket

To create bucket, do the following:

1. Create an [AWS account](https://portal.aws.amazon.com/billing/signup#/start).
2. Go to [console AWS-S3](https://s3.console.aws.amazon.com/s3/home), and click **Create bucket**.

   ![](/images/aws-s3_tutorial_1.jpg)

3. Specify the name and region of the bucket. You can also
   copy the settings of another bucket by clicking on the **Choose bucket** button.
4. Enable **Block all public access**. For access, you will use **access key ID** and **secret access key**.
5. Click **Create bucket**.

A new bucket will appear on the list of buckets.

### Upload data

> **Note**: manifest file is optional.

You need to upload data for annotation and the `manifest.jsonl` file.

1. Prepare data.
   For more information,
   see [prepare the dataset](#prepare-the-dataset).
2. Open the bucket and click **Upload**.

   ![](/images/aws-s3_tutorial_5.jpg)

3. Drag the manifest file and image folder on the page and click **Upload**:

![](/images/aws-s3_tutorial_1.gif)

### Access permissions

#### Authenticated access

To add access permissions, do the following:

1. Go to [IAM](https://console.aws.amazon.com/iamv2/home#/users) and click **Add users**.
2. Set **User name** and enable **Access key - programmatic access**.

   ![](/images/aws-s3_tutorial_2.jpg)

3. Click **Next: Permissions**.
4. Click **Create group**, enter the group name.
5. Use search to find and select:

   - For read-only access: **AmazonS3ReadOnlyAccess**.
   - For full access: **AmazonS3FullAccess**.

   ![](/images/aws-s3_tutorial_3.jpg)

6. (Optional) Add tags for the user and go to the next page.
7. Save **Access key ID** and **Secret access key**.

![](/images/aws-s3_tutorial_4.jpg)

For more information,
see [Creating an IAM user in your AWS account](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html)

#### Anonymous access

On how to grant public access to the
bucket, see
[Configuring block public access settings for your S3 buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/configuring-block-public-access-bucket.html)

### Attach AWS S3 storage

To attach storage, do the following:

1. Log into CVAT and in the separate tab
   open your bucket page.
2. In the CVAT, on the top menu select **Cloud storages** > on the opened page click **+**.

Fill in the following fields:

<!--lint disable maximum-line-length-->

| CVAT                    | AWS S3                                                                                                                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Display name**        | Preferred display name for your storage.                                                                                                                                                                                                            |
| **Description**         | (Optional) Add description of storage.                                                                                                                                                                                                              |
| **Provider**            | From drop-down list select **AWS S3**.                                                                                                                                                                                                              |
| **Bucket name**         | Name of the [Bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingBucket).                                                                                                                                                            |
| **Authentication type** | Depends on the bucket setup: <br><li>**Key id and secret access key pair**: available on [IAM](https://console.aws.amazon.com/iamv2/home?#/users). <br><li>**Anonymous access**: for anonymous access. Public access to the bucket must be enabled. |
| **Region**              | (Optional) Choose a region from the list or add a new one. For more information, see [**Available locations**](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions).               |
| **Prefix**              | (Optional) Prefix is used to filter bucket content. By setting a default prefix, you ensure that only data from a specific folder in the cloud is used in CVAT. This will affect which files you see when creating a task with cloud data.          |
| **Manifests**           | (Optional) Click **+ Add manifest** and enter the name of the manifest file with an extension. For example: `manifest.jsonl`.                                                                                                                       |

<!--lint enable maximum-line-length-->

After filling in all the fields, click **Submit**.

### AWS S3 manifest file

> **Note**: manifest file is optional.

To prepare the manifest file, do the following:

1. Go to [**AWS CLI**](https://aws.amazon.com/cli/) and run
   [script for prepare manifest file](https://github.com/cvat-ai/cvat/tree/develop/utils/dataset_manifest).
2. Perform the installation, following the [**aws-shell manual**](https://github.com/awslabs/aws-shell),
   <br>You can configure credentials by running `aws configure`.
   <br>You will need to enter `Access Key ID` and `Secret Access Key` as well as the region.

```bash
aws configure
Access Key ID: <your Access Key ID>
Secret Access Key: <your Secret Access Key>
```

3. Copy the content of the bucket to a folder on your computer:

```bash
aws s3 cp <s3://bucket-name> <yourfolder> --recursive
```

4. After copying the files, you can create a manifest file as described in
   {{< ilink "/docs/manual/advanced/dataset_manifest" "prepare manifest file section" >}}:

```bash
python <cvat repository>/utils/dataset_manifest/create.py --output-dir <yourfolder> <yourfolder>
```

5. When the manifest file is ready, upload it to aws s3 bucket:

- For read and write permissions when you created the user, run:

```bash
aws s3 cp <yourfolder>/manifest.jsonl <s3://bucket-name>
```

- For read-only permissions, use the download through the browser,
  click upload, drag the manifest file to the page and click upload.

![](/images/aws-s3_tutorial_5.jpg)

### Video tutorial: Add AWS S3 as Cloud Storage in CVAT

<!--lint disable maximum-line-length-->

<iframe width="560" height="315" src="https://www.youtube.com/embed/y6fgZ4X87Lc?si=5EewLS4XA7birS25" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
<!--lint enable maximum-line-length-->

## Google Cloud Storage

### Create a bucket

To create bucket, do the following:

1. Create [Google account](https://support.google.com/accounts/answer/27441?hl=en) and log into it.
2. On the [Google Cloud](https://cloud.google.com/) page, click **Start Free**, then enter the required
   data and accept the terms of service.
   > **Note:** Google requires to add payment, you will need a bank card to accomplish step 2.
3. [Create a Bucket](https://cloud.google.com/storage/docs/creating-buckets) with the following parameters:
   - **Name your bucket**: Unique name.
   - **Choose where to store your data**: Set up a location nearest to you.
   - **Choose a storage class for your data**: `Set a default class` > `Standard`.
   - **Choose how to control access to objects**: `Enforce public access prevention on this bucket` >
     `Uniform` (default).
   - **How to protect data**: `None`

![GB](/images/google_bucket.png)

You will be forwarded to the bucket.

### Upload data

> **Note**: manifest file is optional.

You need to upload data for annotation and the `manifest.jsonl` file.

1. Prepare data.
   For more information,
   see [prepare the dataset](#prepare-the-dataset).
2. Open the bucket and from the top menu
   select **Upload files** or **Upload folder**
   (depends on how your files are organized).

### Access permissions

To access Google Cloud Storage get a **Project ID**
from [cloud resource manager page](https://console.cloud.google.com/cloud-resource-manager)

![](/images/google_cloud_storage_tutorial5.jpg)

And follow instructions below based on the preferable type of access.

#### Authenticated access

For authenticated access you need to create a service account and key file.

To create a service account:

1. On the Google Cloud platform, go to **IAM & Admin** > **Service Accounts** and click **+Create Service Account**.
2. Enter your account name and click **Create And Continue**.
3. Select a role, for example **Basic** > **Viewer**, and click **Continue**.
4. (Optional) Give access rights to the service account.
5. Click **Done**.

![](/images/google_cloud_storage_tutorial2.jpg)

To create a key:

1. Go to **IAM & Admin** > **Service Accounts** > click on account name > **Keys**.
2. Click **Add key** and select **Create new key** > **JSON**
3. Click **Create**. The key file will be downloaded automatically.

![](/images/google_cloud_storage_tutorial3.jpg)

For more information about keys, see
[Learn more about creating keys](https://cloud.google.com/docs/authentication/getting-started).

#### Anonymous access

To configure anonymous access:

1. Open the bucket and go to the **Permissions** tab.
2. Сlick **+ Grant access** to add new principals.
3. In the **New principals** field specify `allUsers`,
   select roles: `Cloud Storage Legacy` > `Storage Legacy Bucket Reader`.
4. Click **Save**.

![](/images/google_cloud_storage_tutorial4.jpg)

Now you can attach the Google Cloud Storage bucket to CVAT.

### Attach Google Cloud Storage

To attach storage, do the following:

1. Log into CVAT and in the separate tab
   open your [bucket](https://console.cloud.google.com/storage/browser)
   page.
2. In the CVAT, on the top menu select **Cloud storages** > on the opened page click **+**.

Fill in the following fields:

<!--lint disable maximum-line-length-->

| CVAT                    | Google Cloud Storage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Display name**        | Preferred display name for your storage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Description**         | (Optional) Add description of storage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Provider**            | From drop-down list select **Google Cloud Storage**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Bucket name**         | Name of the bucket. You can find it on the [storage browser page](https://console.cloud.google.com/storage/browser).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Authentication type** | Depends on the bucket setup: <br><li>**Authenticated access**: Click on the **Key file** field and upload key file from computer. <br> **Advanced**: For self-hosted solution, if the key file was not attached, then environment variable `GOOGLE_APPLICATION_CREDENTIALS` that was specified for an environment will be used. For more information, see [Authenticate to Cloud services using client libraries](https://cloud.google.com/docs/authentication/client-libraries#setting_the_environment_variable).<br><li> **Anonymous access**: for anonymous access. Public access to the bucket must be enabled. |
| **Prefix**              | (Optional) Used to filter data from the bucket. By setting a default prefix, you ensure that only data from a specific folder in the cloud is used in CVAT. This will affect which files you see when creating a task with cloud data.                                                                                                                                                                                                                                                                                                                                                                           |
| **Project ID**          | [Project ID](#authenticated-access). <br>For more information, see [projects page](https://cloud.google.com/resource-manager/docs/creating-managing-projects) and [cloud resource manager page](https://console.cloud.google.com/cloud-resource-manager). <br>**Note:** Project name does not match the project ID.                                                                                                                                                                                                                                                                                                 |
| **Location**            | (Optional) Choose a region from the list or add a new one. For more information, see [**Available locations**](https://cloud.google.com/storage/docs/locations#available-locations).                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Manifests**           | (Optional) Click **+ Add manifest** and enter the name of the manifest file with an extension. For example: `manifest.jsonl`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

<!--lint enable maximum-line-length-->

After filling in all the fields, click **Submit**.

### Video tutorial: Add Google Cloud Storage as Cloud Storage in CVAT

<!--lint disable maximum-line-length-->

<iframe width="560" height="315" src="https://www.youtube.com/embed/pl2KZqJouvI?si=58sziJGbHHc-Mcom" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

<!--lint enable maximum-line-length-->

## Microsoft Azure Blob Storage

### Create a bucket

To create bucket, do the following:

1. Create an [Microsoft Azure](https://azure.microsoft.com/en-us/free/) account and log into it.
2. Go to [Azure portal](https://portal.azure.com/#home), hover over the resource
   , and in the pop-up window click **Create**.

   ![](/images/azure_blob_container_tutorial1.jpg)

3. Enter a name for the group and click **Review + create**, check the entered data and click **Create**.
4. Go to the [resource groups page](https://portal.azure.com/#view/HubsExtension/BrowseResourceGroups),
   navigate to the group that you created and click **Create resources**.
5. On the marketplace page, use search to find **Storage account**.

   ![](/images/azure_blob_container_tutorial2.png)

6. Click on **Storage account** and on the next page click **Create**.
7. On the **Basics** tab, fill in the following fields:

   - **Storage account name**: to access container from CVAT.
   - Select a region closest to you.
   - Select **Performance** > **Standard**.
   - Select **Local-redundancy storage (LRS)**.
   - Click **next: Advanced>**.

   ![](/images/azure_blob_container_tutorial4.png)

8. On the **Advanced** page, fill in the following fields:
   - (Optional) Disable **Allow enabling public access on containers** to prohibit anonymous access to the container.
   - Click **Next > Networking**.

![](/images/azure_blob_container_tutorial5.png)

9. On the **Networking** tab, fill in the following fields:

   - If you want to change public access, enable **Public access from all networks**.
   - Click **Next>Data protection**.

     > You do not need to change anything in other tabs until you need some specific setup.

10. Click **Review** and wait for the data to load.
11. Click **Create**. Deployment will start.
12. After deployment is over, click **Go to resource**.

![](/images/azure_blob_container_tutorial6.jpg)

### Create a container

To create container, do the following:

1. Go to the containers section and on the top menu click **+Container**

![](/images/azure_blob_container_tutorial7.jpg)

3. Enter the name of the container.
4. (Optional) In the **Public access level** drop-down, select type of the access.
   <br>**Note:** this field will inactive if you disabled **Allow enabling public access on containers**.
5. Click **Create**.

### Upload data

You need to upload data for annotation and the `manifest.jsonl` file.

1. Prepare data.
   For more information,
   see [prepare the dataset](#prepare-the-dataset).
2. Go to container and click **Upload**.
3. Click **Browse for files** and select images.
   > Note: If images are in folder, specify folder in the **Advanced settings** > **Upload to folder**.
4. Click **Upload**.

![](/images/azure_blob_container_tutorial9.jpg)

### SAS token and connection string

Use the SAS token or connection string to grant secure access to the container.

To configure the credentials:

1. Go to **Home** > **Resource groups** > You resource name > Your storage account.
2. On the left menu, click **Shared access signature**.
3. Change the following fields:
   - **Allowed services**: Enable **Blob** . Disable all other fields.
   - **Allowed resource types**: Enable **Container** and **Object**. Disable all other fields.
   - **Allowed permissions**: Enable **Read**, **Write**, and **List**. Disable all other fields.
   - **Start and expiry date**: Set up start and expiry dates.
   - **Allowed protocols**: Select **HTTPS and HTTP**
   - Leave all other fields with default parameters.
4. Click **Generate SAS and connection string** and copy **SAS token** or **Connection string**.

![](/images/azure_blob_container_tutorial3.jpg)

### Personal use

For personal use, you can use the **Access Key**
from your storage account in the CVAT **SAS Token** field.

To get the **Access Key**:

1. In the Azure Portal, go to the **Security + networking** > **Access Keys**
2. Click **Show** and copy the key.

![](/images/azure_blob_container_tutorial8.jpg)

### Attach Azure Blob Storage

To attach storage, do the following:

1. Log into CVAT and in the separate tab
   open your bucket page.
2. In the CVAT, on the top menu select **Cloud storages** > on the opened page click **+**.

Fill in the following fields:

<!--lint disable maximum-line-length-->

| CVAT                    | Azure                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Display name**        | Preferred display name for your storage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Description**         | (Optional) Add description of storage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Provider**            | From drop-down list select **Azure Blob Container**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Container name`**     | Name of the cloud storage container.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Authentication type** | Depends on the container setup. <br>**[Account name and SAS token](https://docs.microsoft.com/en-us/azure/cognitive-services/translator/document-translation/create-sas-tokens?tabs=blobs)**: <ul><li>**Account name** enter storage account name. <li>**SAS token** is located in the **Shared access signature** section of your [Storage account](#sas-token).</ul>. **[Anonymous access](https://docs.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-configure?tabs=portal)**: for anonymous access **Allow enabling public access on containers** must be enabled. |
| **Prefix**              | (Optional) Used to filter data from the bucket. By setting a default prefix, you ensure that only data from a specific folder in the cloud is used in CVAT. This will affect which files you see when creating a task with cloud data.                                                                                                                                                                                                                                                                                                                                                 |
| **Manifests**           | (Optional) Click **+ Add manifest** and enter the name of the manifest file with an extension. For example: `manifest.jsonl`.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

<!--lint enable maximum-line-length-->

After filling in all the fields, click **Submit**.

### Video tutorial: Add Microsoft Azure Blob Storage as Cloud Storage in CVAT

<!--lint disable maximum-line-length-->

<iframe width="560" height="315" src="https://www.youtube.com/embed/nvrm8oFBKMY?si=v2z6Rjlc250niXPX" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

<!--lint enable maximum-line-length-->

## Prepare the dataset

For example, the dataset is [The Oxford-IIIT Pet Dataset](https://www.robots.ox.ac.uk/~vgg/data/pets/):

1. Download the [archive with images](https://www.robots.ox.ac.uk/~vgg/data/pets/data/images.tar.gz).
2. Unpack the archive into the prepared folder.
3. Create a manifest. For more information, see
   {{< ilink "/docs/manual/advanced/dataset_manifest" "**Dataset manifest**" >}}:

```bash
python <cvat repository>/utils/dataset_manifest/create.py --output-dir <your_folder> <your_folder>
```
