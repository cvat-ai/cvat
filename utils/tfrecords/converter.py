#!/usr/bin/env python
#
# SPDX-License-Identifier: MIT
# coding: utf-8
# -*- coding: utf-8 -*-
"""
Given a CVAT XML and a directory with the image dataset, this script reads the
CVAT XML and writes the annotations in tfrecords into a given
directory.

This implementation supports annotated images only.
"""
from __future__ import unicode_literals
import xml.etree.ElementTree as ET
import tensorflow as tf
from object_detection.utils import dataset_util
from collections import Counter
import codecs
import hashlib
from pathlib import Path
import argparse
import os
import string

# we need it to filter out non-ASCII characters otherwise
# trainning will crash
printable = set(string.printable)

def parse_args():
    """Parse arguments of command line"""
    parser = argparse.ArgumentParser(
        description='Convert CVAT XML annotations to tfrecords format'
    )

    parser.add_argument(
        '--cvat-xml', metavar='FILE', required=True,
        help='input file with CVAT annotation in xml format'
    )

    parser.add_argument(
        '--image-dir', metavar='DIRECTORY', required=True,
        help='directory which contains original images'
    )

    parser.add_argument(
        '--output-dir', metavar='DIRECTORY', required=True,
        help='directory for output annotations in tfrecords format'
    )

    parser.add_argument(
        '--train-percentage', metavar='PERCENTAGE', required=False, default=90, type=int,
        help='the percentage of training data to total data (default: 90)'
    )

    parser.add_argument(
        '--min-train', metavar='NUM', required=False, default=10, type=int,
        help='The minimum number of images above which the label is considered (default: 10)'
    )

    parser.add_argument(
        '--attribute', metavar='NAME', required=False, default="",
        type=str,
        help='The attribute name based on which the object can identified'
    )

    return parser.parse_args()

def process_cvat_xml(args):
  """Transforms a single XML in CVAT format to tfrecords.
  """

  train_percentage = int(args.train_percentage)
  assert (train_percentage<=100 and train_percentage>=0)

  cvat_xml = ET.parse(args.cvat_xml).getroot()

  output_dir = Path(args.output_dir)
  if not output_dir.exists():
    print("Creating the output directory because it doesn't exist")
    output_dir.mkdir()

  cvat_name, output_dir, min_train = \
          args.attribute, output_dir.absolute(), args.min_train

  # Open the tfrecord files for writing
  writer_train = tf.python_io.TFRecordWriter(
      os.path.join(output_dir.absolute(), 'train.tfrecord'))
  writer_eval  = tf.python_io.TFRecordWriter(
      os.path.join(output_dir.absolute(), 'eval.tfrecord'))

  # extract the object names
  object_names = []
  num_imgs = 0
  for img in cvat_xml.findall('image'):
        num_imgs += 1
        for box in img:
            if cvat_name == "" :
                obj_name = ''.join(filter(lambda x: x in printable,
                    box.attrib['label']))
                object_names.append(obj_name)
            else :
                for attribute in box :
                    if attribute.attrib['name'] == cvat_name :
                        obj_name = ''.join(filter(lambda x: x in printable,
                            attribute.text.lower()))
                        object_names.append(obj_name)

  labels, values = zip(*Counter(object_names).items())

  # Create the label map file
  saved_dict = dict()
  reverse_dict = dict()
  with codecs.open(os.path.join(output_dir,'label_map.pbtxt'),
            'w', encoding='utf8') as f:
        counter = 1
        for iii, label in enumerate(labels):
            if values[iii] < min_train :
                continue
            saved_dict[label] = counter
            reverse_dict[counter] = label
            f.write(u'item {\n')
            f.write(u'\tid: {}\n'.format(counter))
            f.write(u"\tname: '{}'\n".format(label))
            f.write(u'}\n\n')
            counter+=1

  num_iter = num_imgs
  eval_num = num_iter * (100 - train_percentage) // 100
  train_num = num_iter - eval_num


  for counter,example in enumerate(cvat_xml.findall('image')):
    tf_example = create_tf_example(example, args.attribute, saved_dict,  args.image_dir)
    if tf_example is None:
        continue
    if(counter < train_num):
        writer_train.write(tf_example.SerializeToString())
    else :
        writer_eval.write(tf_example.SerializeToString())

  writer_train.close()
  writer_eval.close()


  return saved_dict, num_imgs


# Defining the main conversion function
def create_tf_example(example, cvat_name, saved_dict, img_dir):
  # Process one image data per run
  height = int(example.attrib['height']) # Image height
  width = int(example.attrib['width']) # Image width
  filename = os.path.join(img_dir, example.attrib['name'])
  _, ext = os.path.splitext(example.attrib['name'])

  filename = filename.encode('utf8')
  with tf.gfile.GFile(filename,'rb') as fid:
    encoded_jpg = fid.read()

  key = hashlib.sha256(encoded_jpg).hexdigest()

  if ext.lower() in ['.jpg','.jpeg'] :
    image_format = 'jpeg'.encode('utf8')
  elif ext.lower() == '.png' :
    image_format = 'png'.encode('utf8')
  else:
    print('File Format not supported, Skipping')
    return None

  xmins = [] # List of normalized left x coordinates in bounding box (1 per box)
  xmaxs = [] # List of normalized right x coordinates in bounding box
             # (1 per box)
  ymins = [] # List of normalized top y coordinates in bounding box (1 per box)
  ymaxs = [] # List of normalized bottom y coordinates in bounding box
             # (1 per box)
  classes_text = [] # List of string class name of bounding box (1 per box)
  classes = [] # List of integer class id of bounding box (1 per box)

  # Loop oer the boxes and fill the above fields
  for box in example:
    box_name = ''
    if cvat_name == "" :
        box_name = box.attrib['label']
    else :
        for attr in box:
            if attr.attrib['name'] == cvat_name:
                box_name = attr.text.lower()

    # filter out non-ASCII characters
    box_name = ''.join(filter(lambda x: x in printable, box_name))

    if box_name in saved_dict.keys():
        xmins.append(float(box.attrib['xtl']) / width)
        xmaxs.append(float(box.attrib['xbr']) / width)
        ymins.append(float(box.attrib['ytl']) / height)
        ymaxs.append(float(box.attrib['ybr']) / height)
        classes_text.append(box_name.encode('utf8'))
        classes.append(saved_dict[box_name])

  tf_example = tf.train.Example(features=tf.train.Features(feature={
      'image/height': dataset_util.int64_feature(height),
      'image/width': dataset_util.int64_feature(width),
      'image/filename': dataset_util.bytes_feature(filename),
      'image/source_id': dataset_util.bytes_feature(filename),
      'image/key/sha256': dataset_util.bytes_feature(key.encode('utf8')),
      'image/encoded': dataset_util.bytes_feature(encoded_jpg),
      'image/format': dataset_util.bytes_feature(image_format),
      'image/object/bbox/xmin': dataset_util.float_list_feature(xmins),
      'image/object/bbox/xmax': dataset_util.float_list_feature(xmaxs),
      'image/object/bbox/ymin': dataset_util.float_list_feature(ymins),
      'image/object/bbox/ymax': dataset_util.float_list_feature(ymaxs),
      'image/object/class/text': dataset_util.bytes_list_feature(classes_text),
      'image/object/class/label': dataset_util.int64_list_feature(classes),
  }))
  return tf_example

def main():
  args = parse_args()
  process_cvat_xml(args)

if __name__== '__main__' :
  main()

