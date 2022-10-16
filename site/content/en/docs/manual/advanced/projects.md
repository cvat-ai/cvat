---
title: 'Projects page'
linkTitle: 'Projects page'
weight: 1
description: 'Projects documentation provides details on how to create the CVAT project, load the CVAT project from a backup, and navigate through the project.'


---

## Projects page

CVAT project (hereinafter - project) is a top-level container that helps you to keep CVAT tasks of the same type better organized.

A project usually corresponds to a dataset.

Use this page to create a Project with specified settings like issue tracker, source storage, target storage, bug tracker, segment size, image quality, and others.

Settings of the project will further propagate to the task(s) associated with it.

To open the Project page:

1. [Log in](https://app.cvat.ai/) to your CVAT account or open the CVAT main page if you run the CVAT server locally.
2. On the top navigation bar, click **Projects**.

You will see the following page:


![CVAT Project main page](/images/cvat-project-main-page.png)



1. **Projects** is the navigation bar option to get to the Projects page.
2. **Search box** Use it to find the project by name or assignee.
3. Filters:

   1. **Sort by** Use it to filter projects by selected properties like assignee, update date, and others.
   2. **Quick filters** Use it to filter by projects assigned to you, owned by you, and not complete projects.
   3. **Filter** Use it for customizable searches by adding your own filtering rules and groups.
   4. **Clear filters** is only active, when one of the filters is active. Use it to clear all filters.
4. ![Plus](/images/plus.png) . Click it to open the drop-down menu:

   1. **Create new project** Use it to create a new project.
   2. **Create from backup** Use it to create a project from the backup.
5. **Create a new one** duplicates **Create new project**, use it to create a new project.
6. Project pane, where the created project will appear.


## Create a new project



> **Note** that the project will appear in the organization that you selected at the time of creation.
> For more information, see [organizations](/docs/manual/advanced/organization/).

There are two types of labels that you can add to the project at the same time:

- Skeleton labels - where you must add "skeleton" to the uploaded picture.
- Regular labels - all other types of labels

The main steps of the procedure are common for both types of labels.
On how to set up a sceleton lable, see [setup sceleton](#setup-sceleton-extention),

To create a new project, do the following:

1. In the top right part of the screen click ![Plus](/images/plus.png), and from the drop-down menu select **Create new project**.

   ![Create new project window](/images/create_new_project.png)

2. Go to the **Constructor** tab.
3. In the **Name** field enter the name of your project.
4. Click **Add label** and fill in the following fields:

   1. **Label name** Mandatory field. Enter the name of the annotation label.
   2. **Change colour of the label** (![change colour of the label](/images/color-field.png)) Optional field. Click the icon and select the color from the color palette.
   3. **Add attribute** Optional field. Opens a menu, where you can set the following attributes:

      1. **Name** Mandatory field. Enter the name of the attribute.
      2. From the drop-down list, select an HTML element, representing the attribute:

         - **Select** is a placeholder and cannot be used as an attribute.
         - **Radio** Use it to add a radio button, to select only one option from several.
         - **Checkbox** Use it to add a checkbox for multiple options choice.
         - **Text** Use it for text attributes.
         - **Number** Use it for numeric attributes.
      3. In the **Attribute value** field, specify the attribute value. This field depends on the type of the HTML element from the previous step:

         - For **Radio** enter one or more text values. To separate values, press Enter after each value name. To remove value from the field, at the end of the value name, click `X`.
         - For **Checkbox** from the drop-down list select one of the values **True** or **False**.
         - For **Text** enter the default value in a text form. You can specify only one default value.
         - For **Number** specify a range, separated by a semicolon, from the lowest number to the highest number, and step.  For example: `10;100;2`
      4. If you want to change the attribute from frame to frame, select the **Mutable** checkbox.
      5. If you want to remove the attribute, click ![Garbage bin](/images/garbage-bin.png)
      > **Note** you can add more than one attribute, by clicking **Add attribute**  more than one time.

      ![Create project-filled labels and attributes](/images/create_new_project_01.png)
5. Click **Continue**. Now the project has a label. To add more labels repeat steps 1 to 5.

   ![Create project filled labels and attributes](/images/create_new_project_02.png)

6. Optional. Use **Advanced configuration** to add an issue tracker, source storage, and target storage to the project:

   1. Click the **Advanced configuration** drop-down.
   2. In the **Issue tracker** field, enter the URL of the issue tracker, that you use.
   3. In the **Source storage** field enter the source storage from which you import resources.
   4. In the **Target storage** field enter the target storage to export resources.
7. Click:
   - In case you want to open a new project **Submit & open**
   - In case you want to create another project **Submit & continue**

The project will appear on the project pane.



### Filter

> Applying filter disables the [quick filter][quick-filters].

The filter works similarly to the filters for annotation,
you can create rules from [properties](#supported-properties-for-projects-list),
[operators][operators] and values and group rules into [groups][groups].
For more details, see the [filter section][create-filter].
Learn more about [date and time selection][data-and-time].

For clear all filters press `Clear filters`.

### Supported properties for projects list

| Properties     | Supported values                             | Description                                 |
| -------------- | -------------------------------------------- | ------------------------------------------- |
| `Assignee`     | username                                     | Assignee is the user who is working on the project, task or job. <br>(is specified on task page) |
| `Owner`        | username                                     | The user who owns the project, task, or job |
| `Last updated` | last modified date and time (or value range) | The date can be entered in the `dd.MM.yyyy HH:mm` format <br>or by selecting the date in the window that appears <br>when you click on the input field |
| `ID`           | number or range of job ID                    |                                             |
| `Name`         | name                                         | On the tasks page - name of the task,<br> on the project page - name of the project |



![](/images/image191.jpg)

Once created, the project will appear on the projects page. To open a project, just click on it.

![](/images/image192_mapillary_vistas.jpg)

Here you can do the following:

1. Change the project's title.
1. Open the `Actions` menu. Each button is responsible for a specific function in the `Actions` menu:
   - `Export dataset`/`Import dataset` - download/upload annotations or annotations and images in a specific format.
     More information is available in the [export/import datasets](/docs/manual/advanced/export-import-datasets/)
     section.
   - `Backup project` - make a backup of the project read more in the [backup](/docs/manual/advanced/backup/) section.
   - `Delete` - remove the project and all related tasks.
1. Change issue tracker or open issue tracker if it is specified.
1. Change labels and skeleton.
   You can add new labels or add attributes for the existing labels in the `Raw` mode or the `Constructor` mode.
   You can also change the color for different labels.
   By clicking `Setup skeleton` you can create a skeleton for this project.

1. Assigned to — is used to assign a project to a person.
   Start typing an assignee's name and/or choose the right person out of the dropdown list.
1. `Tasks` — is a list of all tasks for a particular project, with the ability to search,
   sort and filter for tasks in the project.
   [Read more about search](/docs/manual/advanced/search/).
   [Read more about sorting and filter](/docs/manual/advanced/filter/#sort-and-filter-projects-tasks-and-jobs)
It is possible to choose a subset for tasks in the project. You can use the available options
(`Train`, `Test`, `Validation`) or set your own.

[create-filter]: /docs/manual/advanced/filter/#create-a-filter
[operators]: /docs/manual/advanced/filter/#supported-operators-for-properties
[groups]: /docs/manual/advanced/filter/#groups
[data-and-time]: /docs/manual/advanced/filter#date-and-time-selection
[sorting]: /docs/manual/advanced/filter/#sort-by
[quick-filters]: /docs/manual/advanced/filter/#quick-filters