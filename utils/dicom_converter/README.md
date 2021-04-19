# Description

The script is used to convert some kinds of DICOM data to regular images.
Then you can annotate these images on CVAT and get a segmentation mask.
The conversion script was tested on CT, MT and some multi-frame DICOM data.
DICOM files with series (multi-frame) are saved under the same name with a number postfix: 001, 002, 003, etc.

# Installation

```bash
python3 -m venv .env
. .env/bin/activate
pip install -r requirements.txt
```

# Running

```
. .env/bin/activate # if not activated
python script.py input_data output_data
```
