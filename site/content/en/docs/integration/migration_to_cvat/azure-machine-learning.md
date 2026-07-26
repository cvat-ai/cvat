---
title: 'Migrating data from Azure Machine Learning to CVAT'
linkTitle: 'Azure Machine Learning'
weight: 1
description: 'Learn how to migrate datasets and annotations from Azure Machine Learning Data Labeling to CVAT.'
---

This guide explains how to migrate datasets and annotations from
Azure Machine Learning (ML) Data Labeling component to CVAT.

It covers projects created for Object Identification (Bounding Box) and Instance Segmentation (Polygon) tasks,
including Azure Blob Storage integration, dataset preparation, annotation export from Azure ML, task creation in CVAT,
 and annotation import.

## Migrating Object Identification (Bounding Box) and Instance Segmentation (Polygon) Projects

Existing projects created in **Azure ML Data Labeling** can be migrated to CVAT, allowing you to continue working
with your datasets and annotations on the CVAT platform.

The migration process for **Object Identification (Bounding Box)** and **Instance Segmentation (Polygon)** projects
is nearly identical. In this guide, we will use an Object Identification project as an example.

### Exporting Annotations from Azure ML

1. On the **Data Labeling** page in Azure ML, select the project you want to migrate.

   ![Azure ML Data Labeling project list](/images/migration-azure/azure-ml-data-labeling-project-list.webp)

2. Open the project and click **Export** to begin exporting the annotation data.

   ![Export button in Azure ML](/images/migration-azure/azure-ml-project-export-button.webp)

3. In the export dialog, select the following options:

   - **Asset type:** Labeled
   - **Export format:** COCO file
   - **Coordinate type:** Absolute
   - **Export File Name:** Optional

   > The most important settings are **Export format** and **Coordinate type**. These must be configured correctly
   > to ensure that the annotations can be successfully imported into CVAT.

   ![Export dialog settings](/images/migration-azure/azure-ml-export-dialog-coco-settings.webp)

4. Confirm the export by clicking **Submit**.

   ![Submit button](/images/migration-azure/azure-ml-export-submit-button.webp)

5. Wait until the export process is complete. Once the export file is ready, a notification will appear.
   Download the exported annotation file.

   ![Export complete notification](/images/migration-azure/azure-ml-export-complete-download-link.webp)

### Creating a Task in CVAT

After downloading the annotation file, the next step is to create a task in CVAT. For detailed information about
task creation, see the
[Tasks page documentation](https://docs.cvat.ai/docs/workspace/tasks-page/#advanced-configuration).

1. On the **Tasks** page, click the **+** button in the upper-right corner and select **Create a new task**
   from the menu.

   ![Creating a new task in CVAT](/images/migration-azure/cvat-tasks-page-create-new-task.webp)

2. A task creation form will open. Specify:
   - **Task name**
   - **Labels**

   ![Task creation form](/images/migration-azure/cvat-create-task-form-name-and-labels.webp)

#### Adding Labels

1. Click **Add label**.
2. Enter the label name.
3. Click **Continue** to create the label.
4. Repeat the process if additional labels are required.
5. When finished, click **Cancel** to close the dialog.

   ![Adding labels](/images/migration-azure/cvat-add-label-dialog.webp)

The added labels will appear in the Constructor.

   ![Labels in the Constructor](/images/migration-azure/cvat-labels-constructor-cat-dog.webp)

> If you used categories in Azure ML Data Labeling, as shown below:
>
> ![Categories in Azure ML](/images/migration-azure/azure-ml-categories-animal-cat-dog.webp)
>
> The corresponding labels in CVAT must follow this format:
>
> ```
> Animal/Cat
> Animal/Dog
> ```
>
> The category name comes first, followed by a forward slash (`/`), then the label name.

#### Adding the Dataset

There are two ways to add a dataset to the task:

**Option 1: Use a dataset stored in Azure Blob Storage**

If the dataset was previously uploaded to Azure ML Data Labeling, you can connect it through the Cloud Storage
integration described in the [Connecting Azure Blob Storage to CVAT](#connecting-azure-blob-storage-to-cvat) section.

1. Open the **Cloud Storage** tab and click **Select cloud storage**.
2. Choose the storage connection previously added to CVAT.

   ![Selecting cloud storage](/images/migration-azure/cvat-task-select-cloud-storage.webp)

3. Select the folder containing the images.

   ![Selecting the image folder](/images/migration-azure/cvat-task-cloud-storage-select-folder.webp)

**Option 2: Upload files from your computer**

If the dataset is stored locally, you can upload it directly by either:

- Dragging and dropping the files into the upload area.
- Clicking the upload area and selecting the dataset from your computer.

![Uploading files from computer](/images/migration-azure/cvat-task-upload-files-from-computer.webp)

#### Advanced Configuration

The **Advanced configuration** section allows you to customize additional task settings, including:

- Image quality
- Image sorting methods
- Splitting the task into multiple jobs for parallel annotation
- Creating consensus tasks
- Other advanced options

For more information, see the [Advanced configuration
documentation](https://docs.cvat.ai/docs/workspace/tasks-page/#advanced-configuration).

After selecting or uploading the dataset, click **Submit & Open** to create the task.

![Submit & Open button](/images/migration-azure/cvat-task-advanced-configuration.webp)

![Task created successfully](/images/migration-azure/cvat-task-submit-and-open.webp)

## Matching Image Paths Between CVAT and the Annotation File

After the task has been created, you can import the annotation file that was previously exported from Azure ML
Data Labeling.

Pay close attention to the image paths stored in the annotation file.

![Annotation file with image paths](/images/migration-azure/coco-annotation-file-path-example.webp)

For example, if the annotation file contains image paths such as:

```json
"file_name": "UI/Cats_and_dogs/pexels-kayla-dahl-maclean-2148236042-30239303.jpg"
```

then the image paths in CVAT must match exactly. For additional details, refer to the
[Important Manifest Requirements](#important-manifest-requirements) section.

If the task was created by uploading files directly from a local computer, CVAT will typically store image names
without any folder structure:

```
pexels-kayla-dahl-maclean-2148236042-30239303.jpg
```

In this case, the annotation file exported from Azure ML Data Labeling will contain image paths that include the
original folder structure:

```
UI/Cats_and_dogs/pexels-kayla-dahl-maclean-2148236042-30239303.jpg
```

To successfully import the annotations, modify the annotation file so that the values in the `file_name` field
match the image names stored in the task. For example, change:

```json
"file_name": "UI/Cats_and_dogs/pexels-kayla-dahl-maclean-2148236042-30239303.jpg"
```

to:

```json
"file_name": "pexels-kayla-dahl-maclean-2148236042-30239303.jpg"
```

You can verify the exact image path used by CVAT by opening the task and checking the filename displayed below
the player.

![Filename displayed below the player](/images/migration-azure/cvat-annotation-player-filename-display.webp)

### Importing the Annotation File

After reviewing the annotation file and ensuring that the image paths match those used by CVAT, import the file
into the task.

1. Open the task and select **Actions > Upload annotations**.

   ![Actions menu with Upload annotations](/images/migration-azure/cvat-task-actions-upload-annotations.webp)

2. In the dialog that appears, click **Import format** and select **COCO 1.0**.

   ![Selecting COCO 1.0 import format](/images/migration-azure/cvat-import-annotation-format-coco.webp)

3. Click the upload area and select the annotation file from your computer, or drag and drop it into the upload
   area.

   ![Upload area for annotation file](/images/migration-azure/cvat-import-annotation-upload-area.webp)

4. Click **OK**.

If the task already contains annotations, CVAT will display a warning asking whether the existing annotations
should be replaced. Click **Replace annotations**.

![Replace annotations warning](/images/migration-azure/cvat-replace-annotations-warning.webp)

A notification will confirm that the annotation import process has started.

![Import started notification](/images/migration-azure/cvat-annotation-import-started-notification.webp)

### Verifying the Imported Annotations

Once the import process is complete, a confirmation notification will appear. Click the **Job** link to open the
annotation job.

![Import complete notification](/images/migration-azure/cvat-annotation-import-finished-notification.webp)

![Job link](/images/migration-azure/cvat-task-job-link.webp)

The imported annotations should now be visible in the workspace.

![Imported annotations in the workspace](/images/migration-azure/cvat-imported-annotations-workspace.webp)

## Connecting Azure Blob Storage to CVAT

CVAT supports integration with cloud storage providers, including Azure Blob Storage. If your datasets and
annotations created in Azure ML Data Labeling are stored in cloud storage, there is no need to download them
locally. Instead, you can connect your storage directly to CVAT and work with your data without transferring
files to your computer. For more information, see
[Cloud storages](https://docs.cvat.ai/docs/workspace/cloud-storages/).

To connect Azure Blob Storage:

1. Sign in to **app.cvat.ai** and navigate to the **Cloud Storages** page.

   ![Cloud Storages page](/images/migration-azure/cvat-cloud-storages-menu.webp)

2. Click the **+** button in the upper-right corner to add a new cloud storage connection.

   ![Add cloud storage button](/images/migration-azure/cvat-cloud-storages-page-add-button.webp)

3. A form for configuring the cloud storage connection will open.

   ![Cloud storage configuration form](/images/migration-azure/cvat-create-cloud-storage-form-empty.webp)

   Fill in the following fields:

   - **Display name** (required) — the name displayed in the list of available cloud storages.
   - **Description** (optional) — a description of the cloud storage.
   - **Provider** (required) — the cloud storage provider.
   - **Prefix** (optional) — used to pre-filter content within the storage container.
   - **Manifest** — a dataset index file listing all images in the container with their exact dimensions.

4. To connect Azure Blob Storage, provide the following information:

   ![Azure Blob Storage fields](/images/migration-azure/cvat-create-cloud-storage-azure-credentials.webp)

   - **Container name** — the name of the container that stores your data.
   - **Authentication type** — one of the following:
     - Account name and SAS token
     - Anonymous access
     - Connection string

   You can find the required connection details on the Azure Blob Storage account page.

   ![Azure Blob Storage account page](/images/migration-azure/azure-portal-storage-account-access-keys.webp)

5. If your dataset was created through Azure ML, you can identify the container name by navigating to
   **Assets > Data**, locating the desired dataset, and clicking the **Datastore** link in the **Data source**
   column.

   ![Assets > Data in Azure ML](/images/migration-azure/azure-ml-assets-data-datastore-link.webp)

   There, you can find the **Blob container** name.

   ![Blob container name](/images/migration-azure/azure-ml-datastore-blob-container-name.webp)

> To ensure that CVAT servers can access the data stored in your Azure Blob Storage, open the Azure Portal
> and navigate to your **Storage Account** settings.
>
> Go to **Security + networking > Networking** and verify that **Public network access** is set to
> **Enabled from all networks**.
>
> ![Public network access setting](/images/migration-azure/azure-portal-storage-networking-public-access.webp)

## Preparing the Manifest File

Before connecting the storage, you must prepare a manifest file containing image paths, image dimensions,
and metadata. The manifest file must be placed in the root directory of the container.

![Manifest file structure](/images/migration-azure/azure-blob-storage-manifest-jsonl-content.webp)

For detailed instructions on creating a manifest file, see the
[Dataset manifest documentation](https://docs.cvat.ai/docs/dataset_management/dataset_manifest/).

In the cloud storage configuration form, specify only the manifest file name. In most cases, the default name is:

```
manifest.jsonl
```

### Important Manifest Requirements

To ensure that **app.cvat.ai** successfully recognizes and processes the manifest file, follow these rules
carefully.

#### File Extensions

The `extension` field in the manifest must:

- Include the leading period (`.jpg`, not `jpg`).
- Match the file extension in Azure exactly, including letter case.

Examples:

- If the file is stored as `.jpg`, the manifest must contain `.jpg`.
- If the file is stored as `.JPG`, the manifest must contain `.JPG`.

#### File Names

The `name` field in the manifest must contain the file name **without the extension**.

Example:

```json
"name": "dataset/image_001"
```

#### Critical Path Matching Rule (Manifest + COCO)

When annotations are exported from Azure ML in COCO format, image paths are stored relative to the root of
the container.

Example:

```json
"file_name": "UI/dataset/photo.jpg"
```

To ensure that image paths in the COCO annotation file match the paths defined in the manifest, use the
following configuration:

**In the manifest file** — specify the full relative path in the `name` field:

```json
"name": "UI/dataset/photo"
```

**In Azure Storage** — upload the completed `manifest.jsonl` file to the root of the container, alongside
the dataset folder:

```
Container Root
├── manifest.jsonl
└── UI/
    └── dataset/
        ├── photo.jpg
        └── ...
```

**In CVAT** — leave the **Prefix** field empty when creating the Cloud Storage connection.

#### Manifest File Format

The manifest file must use the `.jsonl` format (JSON Lines). Each line must contain a separate JSON object.

Example:

```jsonl
{"version":"1.1"}
{"type":"images"}
{"name":"image1","extension":".jpg","width":x,"height":y}
{"name":"image2","extension":".jpg","width":x,"height":y}
{"name":"image3","extension":".jpg","width":x,"height":y}
```

![Manifest file example](/images/migration-azure/cvat-cloud-storage-add-manifest-button.webp)

Once the manifest file has been added and all required fields have been completed, click **Submit**.

![Submit button](/images/migration-azure/cvat-cloud-storage-manifest-filled-submit.webp)

After the cloud storage has been successfully added, it will appear on the **Cloud Storages** page.

![Cloud storage added](/images/migration-azure/cvat-cloud-storage-added-available.webp)

## Summary

The migration workflow from Azure ML Data Labeling to CVAT consists of the following steps:

1. Connect Azure Blob Storage to CVAT.
2. Prepare and upload a valid manifest file.
3. Export annotations from Azure ML in COCO format with the following settings:
   - Asset type: **Labeled**
   - Export format: **COCO file**
   - Coordinate type: **Absolute**
4. Create a task in CVAT.
5. Configure labels to match the Azure ML project structure.
6. Add the dataset using either Azure Blob Storage or local file upload.
7. Modify the exported COCO annotation file and ensure image paths match the paths used in CVAT.
8. Import the annotations using the **COCO 1.0** format.
9. Verify that the annotations are displayed correctly in the task.

Following these steps will allow you to successfully migrate datasets and annotations from Azure ML Data
Labeling to CVAT while preserving the existing annotation work.
