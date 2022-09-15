# CVAT API Script


## Purpose
Making automatic transactions over csv in CVAT.


## Config File
includes: </br>
•	[server] </br>
    &emsp; ◦	host= </br>
    &emsp; ◦	port= </br>
•	[log] </br>
    &emsp; ◦	log_file=True </br>
•	[user] </br>
    &emsp; ◦	username= </br>
    &emsp; ◦	password= </br></br>

* Server information is required to access CVAT.
* If log_file is True, logs will be saved to the file. If false, it will not be saved to the file.
* Username and password are required to log in. This section will be blank at first. If this part is empty, these will be requested on the console.


## Csv File Format
In the first line of the file, these headings should be “Organization, Project, TaskName, UploadType, UploadPath, Assignee, JobStage, JobState”. The entered information should not be wrong, this information is checked with the check() command.


## Script Commands
There are 6 main commands in total. These are as follows:


### 1.	 Check
```shell
python3 cvat_script.py check_csv <csv_file>
```

#### Purpose
It checks whether the contents of the csv_file file whose path is given are in the appropriate format. If the format is correct, the message format True is returned. If false, it lists where the errors are.

#### How It Works
If there is missing information in the given csv file, it gives the warning "{index}. row is empty or wrong", this is not an error. Checks whether the information in the Organization, Project, TaskName, Assigne columns is in CVAT. If there is no information available, it will throw an error.

#### NOTE
This process works automatically on every command.

### 2.	List:
```shell
python3 cvat_script.py list
```

#### Purpose
It outputs the current status of all tasks in csv format.
</br>
This command works with 6 different parameters. These:

#### 1.	--organization
```shell
python3 cvat_script.py list --organization <organization_name>
```

Purpose: Generates the current status of all tasks with the same organization as <organization_name> in csv format.

#### 2.	--project
```shell
python3 cvat_script.py list --project <project_name>
```

Purpose: Generates the current status of all tasks with the same project as <project_name> in csv format.


#### 3.	--jobstage
```shell
python3 cvat_script.py list --jobstage <jobstage>
```

Purpose: Generates the current status of all tasks with the same jobstage as <jobstage> in csv format.

#### 4.	--jobstate
```shell
python3 cvat_script.py list --jobstate <jobstate>
```

Purpose: Generates the current status of all tasks with the same jobstate as <jobstate> in csv format.

#### 5.	--andor
```shell
python3 cvat_script.py list  --andor <and_or>
```

for example:
```shell
python3 cvat_script.py list --jobstate in_progress --project project_name --andor or
```

Purpose: It allows multiple filters to be used as OR or AND.
Default: and

#### 6.	--o
```shell
python3 cvat_script.py list  -o <csv_file>
```

for example:
```shell
python3 cvat_script.py list --jobstate in_progress --project project_name --andor or
```

Purpose: Specifies the path to save the csv file.
Default: output.csv


### 3.	Create
```shell
python3 cvat_script.py create <csv_file>
```

#### Purpose
It checks whether the task of each line in the given csv file is open, updates the status if it is open, and opens the task if it is not open.

#### Note
It does not check the TaskName part when checking. Additionally, it checks UploadPath, UploadType, JobStage and JobState.


### 4.	Update
```shell
python3 cvat_script.py update <csv_file>
```

#### Purpose
It checks the status of task of each line in the given csv file, updates it if it will be updated, does not open the task if it is not open. It just performs the update operation.

#### Note
While checking, it additionally checks JobStage and JobState.


### 5.	Export
```shell
python3 cvat_script.py export <csv_file> --format <format_type>
```

#### Purpose
It exports the annotations of each task in the given csv file in the given format.
</br>

Default (--format):  PASCAL_VOC_1.1


### 6.	Upload
```shell
python3 cvat_script.py upload <csv_file> --annotation <annotation_file> --format <format_type>
```

#### Purpose
It imports the annotations of each task in the given csv file in the given format.
</br>

Default (--format):  PASCAL_VOC_1.1

#### NOTE
It compares the names of the folders under the path (<annotation_file>) given with the Annotation file and the TaskNames in the csv file.

# [CVAT (Computer Vision Annotation Tool)](https://github.com/opencv/cvat)
