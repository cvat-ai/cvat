# Auto Annotation Runner

A small command line program to test and run AutoAnnotation Scripts.

## Instructions

Change in to the root of the project directory and run

```shell
$ python cvat/utils/auto_annotation/run_modely.py --py /path/to/python/interp.py \
                                                  --xml /path/to/xml/file.xml \
                                                  --bin /path/to/bin/file.bin \
                                                  --json /path/to/json/mapping/mapping.json
```

Some programs need to run unrestricted or as an administer. Use the `--unrestriced` flag to simulate.

You can pass image files in to fully simulate your findings. Images are passed in as a list

```shell
$ python cvat/utils/auto_annotation/run_modely.py --py /path/to/python/interp.py \
                                                  --xml /path/to/xml/file.xml \
                                                  --bin /path/to/bin/file.bin \
                                                  --json /path/to/json/mapping/mapping.json \
                                                  --image-files /path/to/img.jpg /path2/to/img2.png /path/to/img3.jpg
```

Additionally, it's sometimes useful to visualize your images. 
Use the `--show-images` flag to have each image with the annotations pop up. 

```shell
$ python cvat/utils/auto_annotation/run_modely.py --py /path/to/python/interp.py \
                                                  --xml /path/to/xml/file.xml \
                                                  --bin /path/to/bin/file.bin \
                                                  --json /path/to/json/mapping/mapping.json \
                                                  --image-files /path/to/img.jpg /path2/to/img2.png /path/to/img3.jpg \ 
                                                  --show-images
```

There's a command that let's you scan quickly by setting the length of time (in milliseconds) to display each image. 
Use the `--show-image-delay` flag and set the appropriate time.

```shell
# Display each image in a window for 2 seconds
$ python cvat/utils/auto_annotation/run_modely.py --py /path/to/python/interp.py \
                                                  --xml /path/to/xml/file.xml \
                                                  --bin /path/to/bin/file.bin \
                                                  --json /path/to/json/mapping/mapping.json \
                                                  --image-files /path/to/img.jpg /path2/to/img2.png /path/to/img3.jpg \
                                                  --show-images
                                                  --show-image-delay 2000
```
