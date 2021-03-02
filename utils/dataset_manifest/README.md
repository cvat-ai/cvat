## Simple command line for prepare dataset manifest file

### Steps bufore using

When used separately from Computer Vision Annotation Tool(CVAT), the required modules must be installed

```bash
python3 -m venv .env
. .env/bin/activate
pip install -U pip
pip install -r requirements.txt
```

### **Usage**

```bash
usage: create.py [-h] --type {video,images} [--chunk_size CHUNK_SIZE] manifest_directory sources [sources ...]

positional arguments:
  manifest_directory    Directory where the manifest file will be saved
  sources               Source paths

optional arguments:
  -h, --help            show this help message and exit
  --type {video,images}
                        Type of datset data
  --chunk_size CHUNK_SIZE
                        Chunk size that will be specified when creating the task with specified video and generated manifest file
```

**NOTE**: If ratio of number of frames to number of key frames is small compared to the `chunk size`,
then when creating a task with prepared manifest file, you should expect that the waiting time for some chunks
will be longer than the waiting time for other chunks. (At the first iteration, when there is no chunk in the cache)

### **Examples**

Create a dataset manifest with video:

```bash
python create.py --type video ~/Documents ~/Documents/video.mp4
```

Create a dataset manifest with images:

```bash
python create.py --type images ~/Documents ~/Documents/image1.jpg ~/Documents/image2.jpg ~/Documents/image3.jpg
```
