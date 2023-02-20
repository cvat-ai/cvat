---
title: 'Attach cloud storage'
linkTitle: 'Attach cloud storage'
weight: 23
description: 'Instructions on how to attach cloud storage using UI'
---

In CVAT you can use [AWS-S3](using-aws-s3), [Azure Blob Container](#using-azure-blob-container)
and [Google cloud](#using-google-cloud-storage) storages to store image datasets for your tasks.

## Google Cloud

### Create a bucket

1. Create [Google account](https://support.google.com/accounts/answer/27441?hl=en) and log into it.
2. On  the [Google Cloud](https://cloud.google.com/) page, click **Start Free**, then enter the required
   data and accept the terms of service.
   > **Note:**  Google requires to add payment, you will need bank card to accomplish step 2.
3. [Create a Bucket](https://cloud.google.com/storage/docs/creating-buckets) with the following parameters:
   - **Name your bucket**: Unique name.
   - **Choose where to store your data**: Set up a location nearest to you.
   - **Choose a storage class for your data**: `Set a default class` > `Standart`.
   - **Choose how to control access to objects**: `Enforce public access prevention on this bucket` >
     `Uniform` (default).
   - **How to protect data**: `None`

You will be forwarded to the bucket.

### Upload data

You need to upload data for annotation and `manifest.json` file.

1. Prepare data.
   For more information,
   see [prepare dataset.](#prepare-dataset).
2. Open the bucket and from the top menu
   select **Upload files** or **Upload folder**
   (based on how your files are organized)

### Access permissions

To access Google Cloud Storage get a **Project ID**
from [cloud resource manager page](https://console.cloud.google.com/cloud-resource-manager)

![](/images/google_cloud_storage_tutorial5.jpg)

#### Authorized access

For authorised access need to create a service account and key file.

To create a service account:

1. In Google Cloud platform, go to **IAM & Admin** > **Service Accounts** and click **+Create Service Account**.
2. Enter your account name and click **Create And Continue**.
3. Select a role, for example **Basic** > **Viewer**, and click **Continue**.
4. (Optional) Give access rights to the service account.
5. Click **Done**.



![](/images/google_cloud_storage_tutorial2.jpg)


To create a key:

1. Go to  **IAM & Admin** > **Service Accounts** > click on account name > **Keys**.
2. Click **Add key** and select **Create new key** > **JSON**
3. Click **Create**. The key file will be downloaded automatically.

![](/images/google_cloud_storage_tutorial3.jpg)

For more information about keys, see
[Learn more about creating keys](https://cloud.google.com/docs/authentication/getting-started).

#### Anonymous access

To configure anonymous access:

1. Open the bucket and go to the **Permissions** tab.
2. Сlick **+ Grant access** to add new principals.
3. In **New principals** field specify `allUsers`,
   select roles: `Cloud Storage Legacy` > `Storage Legacy Bucket Reader`
4. Click **Save**.

![](/images/google_cloud_storage_tutorial4.jpg)

Now you can attach new cloud storage into CVAT.

### Attach Google Cloud storage

To attach storage, do the following:

1. Log into CVAT and in the separate tab
   open you [bucket](https://console.cloud.google.com/storage/browser)
   page.
2. In the CVAT, on the top menu select **Cloud storages** > on the opened page click **+**.


Fill in the following fields:

|CVAT| Google Cloud|
|----|----|
|**Display name**|Create a display name|
|**Description**|(Optional) Add descripton of storage|
|**Provider**|From drop-down list select **Google Cloud Storage**.|
|**Bucket name**|Name of the [Bucket](https://cloud.google.com/storage/docs/creating-buckets). You can find it on the [storage browser page](https://console.cloud.google.com/storage/browser)|
|**Authorization type**|Depends on the bucket setup: <br><li>**Authorized access**: Click on the **Key file** field and upload key file from computer.  <br><li> **Anonymous access**: for anonymous access. The public access to the bucket must be enabled.|
|**Prefix**|(Optional) Used to filter data from the bucket.|
|**Project ID**|[Project ID](#authorized-access). <br>For more information, see [projects page](https://cloud.google.com/resource-manager/docs/creating-managing-projects) and [cloud resource manager page](https://console.cloud.google.com/cloud-resource-manager). <br>**Note:** Project name does not match the project ID. |
|**Location**| (Optional) Choose a region from the list or add a new one. For more information, see [**Available locations**](https://cloud.google.com/storage/docs/locations#available-locations).
|**Manifests**|Click **+ Add manifest** and enter the name of the manifest file with extention. For example: `manifest.json`|


## Microsoft Azure

### Create a bucket

1. Create an [Microsoft Azure](https://azure.microsoft.com/en-us/free/) account and log into it.
2. Go to [Azure portal](https://portal.azure.com/#home), hover over the resource
   and in the pop-up window click **Create** .

   ![](/images/azure_blob_container_tutorial1.jpg)

3. Enter a name for the group and click **Review + create**, check the entered data and click **Create**.
4. Go to the [resource groups page](https://portal.azure.com/#blade/HubsExtension/Browse)
   > resource group that you created and click **Create resources**.
5. On the marketplace page, use search to find **Storage account**.
   ![](/images/azure_blob_container_tutorial2.png)
6. Click on **Storage account** and on the next page click **Create**.
7. On the **Basics** tab, fill the following fields:
    - **Storage account name**: to access container from CVAT.
    - Select a region closest to you.
    - Select **Performance** > **Standart**.
    - Select Local-redundancy storage (LRS).
    - Click **next: Advanced>**.

   ![](/images/azure_blob_container_tutorial4.png)
8. On the **Advanced** page, fill the following fields:
    - (Optional) Disable **Allow enabling public access on containers** to prohibit anonymous access to the container.
    - Click **Next > Networking**.

  ![](/images/azure_blob_container_tutorial5.png)

9. On the **Networking** tab, fill the following fields:

   - If you want to change public access, enable **Public access from all networks**.
   - Click **Next>Data protection**

  You do not need to change anything in other tabs, until you need some specific set up.
10. Click **Review** and wait for the data to load.
11. Click C**reate**, deployment will start.
12. After deployment is over, click **Go to resource**.

   ![](/images/azure_blob_container_tutorial6.jpg)

### Create a container

1. Go to the containers section and and on the top meny click **+Container**

  ![](/images/azure_blob_container_tutorial7.jpg)

3. Enter the name of the container.
4. Select container in public access level.
   <br>**Note:** this field will be disabled if you disabled **Allow enabling public access on containers**.
5. Click **Crate**

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



- `Manifest` - the path to the manifest file on your cloud storage.
  You can add multiple manifest files using the `Add manifest` button.
  You can find on how to prepare dataset manifest [`here`](/docs/manual/advanced/dataset_manifest/).
  If you have data on the cloud storage and don't want to download content locally, you can mount your
  cloud storage as a share point according to [`that guide`](/docs/administration/advanced/mounting_cloud_storages/)
  and prepare manifest for the data.

To publish the cloud storage, click `submit`, after which it will be available on
the [Cloud storages page](/docs/manual/basics/cloud-storages/).


## AWS S3

### Create a bucket

1. Create an [AWS account](https://portal.aws.amazon.com/billing/signup#/start).
2. Go to [console AWS-S3](https://s3.console.aws.amazon.com/s3/home), and click **Create bucket**.

   ![](/images/aws-s3_tutorial_1.jpg)

3. Specify the name of the bucket, region, or copy the settings of another bucket by clicking on the **Choose bucket** button.
4. Enable  **Block all public access**. For access  you will use **Access ID** and secret **Access key**.
5. Click **Create bucket**.

New bucket will appear on the list of buckets.

### Upload data

1. Prepare data.
   For more information,
   see [prepare dataset.](#prepare-dataset).
2. Open the bucket, and click **Upload**.

   ![](/images/aws-s3_tutorial_5.jpg)

3. Drag the manifest file and image folder on the page and click **Upload**:

  ![](/images/aws-s3_tutorial_1.gif)

### Access permissions

#### Authorized access

To add access permissions, do the following:

1. Go to [IAM](https://console.aws.amazon.com/iamv2/home#/users), and clikc **Add users**.
2. Set **User name**, and enable **Access key - programmatic access**.

   ![](/images/aws-s3_tutorial_2.jpg)

3. Click **Next: Permissions**.
4. Click **Create group**,  enter the group name.
5. Use search to find and and select:
   - For read-only access: **AmazonS3ReadOnlyAccess**.
   - For full access: **AmazonS3FullAccess**.

   ![](/images/aws-s3_tutorial_3.jpg)

6. (Optional) Add tags for the user, and go to the next page.
7.  Save **Access key ID** and **Secret access key**.

   ![](/images/aws-s3_tutorial_4.jpg)

For more information,
see [Creating an IAM user in your AWS account](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html)

#### Anonimous access

On how to grant public access to the
bucket, see
[Configuring block public access settings for your S3 buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/configuring-block-public-access-bucket.html)

### Attach AWS S3 storage

To attach storage, do the following:

1. Log into CVAT and in the separate tab
   open you bucket page.
2. In the CVAT, on the top menu select **Cloud storages** > on the opened page click **+**.


Fill in the following fields:
|CVAT| AWS S3|
|----|----|
|**Display name**|Create a display name|
|**Description**|(Optional) Add descripton of storage|
|**Provider**|From drop-down list select **AWS S3**.|
|**Bucket name**|Name of the [Bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingBucket).|
|**Authorization type**|Depends on the bucket setup: <br><li>**Key id and secret access key pair**: available on [IAM](https://console.aws.amazon.com/iamv2/home?#/users). <br><li>**Anonymous access**: for anonymous access. Public access to the bucket must be enabled.|
|**Region**| (Optional) Choose a region from the list or add a new one. For more information, see [**Available locations**](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions).|
|**Manifests**|Click **+ Add manifest** and enter the name of the manifest file with extention. For example: `manifest.json`|



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
[script for prepare manifest file](https://github.com/cvat-ai/cvat/tree/develop/utils/dataset_manifest).
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

#### Prepare dataset

For example, let's take [The Oxford-IIIT Pet Dataset](https://www.robots.ox.ac.uk/~vgg/data/pets/):

- Download the [archive with images](https://www.robots.ox.ac.uk/~vgg/data/pets/data/images.tar.gz).
- Unpack the archive into the prepared folder
  and create a manifest file as described in [prepare manifest file section](/docs/manual/advanced/dataset_manifest/):

  ```bash
  python <cvat repository>/utils/dataset_manifest/create.py --output-dir <yourfolder> <yourfolder>
  ```
