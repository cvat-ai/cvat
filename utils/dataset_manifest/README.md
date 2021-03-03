## Simple command line to prepare dataset manifest file

### Steps before use

When used separately from Computer Vision Annotation Tool(CVAT), the required modules must be installed

```bash
python3 -m venv .env
. .env/bin/activate
pip install -U pip
pip install -r requirements.txt
```

### Using

```bash
usage: python create.py [-h] --type {video,images} [--chunk_size CHUNK_SIZE] manifest_directory sources [sources ...]

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

### Examples of using

Create a dataset manifest with video:

```bash
python create.py --type video ~/Documents ~/Documents/video.mp4
```

Create a dataset manifest with images:

```bash
python create.py --type images ~/Documents ~/Documents/image1.jpg ~/Documents/image2.jpg ~/Documents/image3.jpg
```

### Example of generated `manifest.jsonl` for video

```json
{"version":"1.0"}
{"type":"video"}
{"properties":{"name":"video.mp4","resolution":[1280,720],"length":778}}
{"number":0,"pts":0,"checksum":"17bb40d76887b56fe8213c6fded3d540"}
{"number":135,"pts":486000,"checksum":"9da9b4d42c1206d71bf17a7070a05847"}
{"number":270,"pts":972000,"checksum":"a1c3a61814f9b58b00a795fa18bb6d3e"}
{"number":405,"pts":1458000,"checksum":"18c0803b3cc1aa62ac75b112439d2b62"}
{"number":540,"pts":1944000,"checksum":"4551ecea0f80e95a6c32c32e70cac59e"}
{"number":675,"pts":2430000,"checksum":"0e72faf67e5218c70b506445ac91cdd7"}
```

### Example of generated `manifest.jsonl` for dataset with images

```json
{"version":"1.0"}
{"type":"images"}
{"name":"image1","extension":".jpg","width":720,"height":405,"checksum":"548918ec4b56132a5cff1d4acabe9947"}
{"name":"image2","extension":".jpg","width":183,"height":275,"checksum":"4b4eefd03cc6a45c1c068b98477fb639"}
{"name":"image3","extension":".jpg","width":301,"height":167,"checksum":"0e454a6f4a13d56c82890c98be063663"}
```
