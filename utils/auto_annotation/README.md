# Auto Annotation Runner

A small command line program to test and run AutoAnnotation Scripts.

## Instructions

There are two modes to run this script in. If you already have a model uploaded into the server, and you're having 
issues with running it in production, you can pass in the model name and a task id that you want to test against.

```shell
# Note that this module can be found in cvat/utils/auto_annotation/run_model.py
$ python /path/to/run_model.py --model-name mymodel --task-id 4
```

If you're running in docker, this can be useful way to debug your model.

``` shell
$ docker exec -it cvat bash -ic 'python3 ~/cvat/apps/auto_annotation/run_model.py --model-name my-model --task-id 4
```

If you are developing an auto annotation model or you can't get something uploaded into the server, 
then you'll need to specify the individual inputs.

```shell
# Note that this module can be found in cvat/utils/auto_annotation/run_model.py
$ python path/to/run_model.py --py /path/to/python/interp.py \
                              --xml /path/to/xml/file.xml \
                              --bin /path/to/bin/file.bin \
                              --json /path/to/json/mapping/mapping.json
```

Some programs need to run unrestricted or as an administer. Use the `--unrestriced` flag to simulate.

You can pass image files in to fully simulate your findings. Images are passed in as a list

```shell
$ python /path/to/run_model.py --py /path/to/python/interp.py \
                               --xml /path/to/xml/file.xml \
                               --bin /path/to/bin/file.bin \
                               --json /path/to/json/mapping/mapping.json \
                               --image-files /path/to/img.jpg /path2/to/img2.png /path/to/img3.jpg
```

Additionally, it's sometimes useful to visualize your images. 
Use the `--show-images` flag to have each image with the annotations pop up. 

```shell
$ python /path/to/run_model.py --py /path/to/python/interp.py \
                               --xml /path/to/xml/file.xml \
                               --bin /path/to/bin/file.bin \
                               --json /path/to/json/mapping/mapping.json \
                               --image-files /path/to/img.jpg /path2/to/img2.png /path/to/img3.jpg \ 
                               --show-images
```

If you'd like to see the labels printed on the image, use the `--show-labels` flag

```shell
$ python /path/to/run_model.py --py /path/to/python/interp.py \
                               --xml /path/to/xml/file.xml \
                               --bin /path/to/bin/file.bin \
                               --json /path/to/json/mapping/mapping.json \
                               --image-files /path/to/img.jpg /path2/to/img2.png /path/to/img3.jpg \ 
                               --show-images \
		               --show-labels
```

There's a command that let's you scan quickly by setting the length of time (in milliseconds) to display each image. 
Use the `--show-image-delay` flag and set the appropriate time.
In this example, 2000 milliseconds is 2 seconds for each image.

```shell
# Display each image in a window for 2 seconds
$ python /path/to/run_model.py --py /path/to/python/interp.py \
                               --xml /path/to/xml/file.xml \
                               --bin /path/to/bin/file.bin \
                               --json /path/to/json/mapping/mapping.json \
                               --image-files /path/to/img.jpg /path2/to/img2.png /path/to/img3.jpg \
                               --show-images \
                               --show-image-delay 2000
```

Visualization isn't always enough. 
The CVAT has a serialization step that can throw errors on model upload even after successful visualization.
You must install the necessary packages installed, but then you can add the `--serialize` command to ensure that your 
results will serialize correctly.

```shell
$ python /path/to/run_model.py --py /path/to/python/interp.py \
                               --xml /path/to/xml/file.xml \
                               --bin /path/to/bin/file.bin \
                               --json /path/to/json/mapping/mapping.json \
                               --image-files /path/to/img.jpg /path2/to/img2.png /path/to/img3.jpg \
                               --serialize
```
