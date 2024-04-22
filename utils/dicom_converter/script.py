# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT


import os
import argparse
import logging
from glob import glob

import numpy as np
from tqdm import tqdm
from PIL import Image
from pydicom import dcmread
from pydicom.pixel_data_handlers.util import convert_color_space


# Script configuration
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
parser = argparse.ArgumentParser(description='The script is used to convert some kinds of DICOM (.dcm) files to regular image files (.png)')
parser.add_argument('input', type=str, help='A root directory with medical data files in DICOM format. The script finds all these files based on their extension')
parser.add_argument('output', type=str, help='Where to save converted files. The script repeats internal directories structure of the input root directory')
args = parser.parse_args()


class Converter:
    def __init__(self, filename):
        with dcmread(filename) as ds:
            self._pixel_array = ds.pixel_array
            self._photometric_interpretation = ds.PhotometricInterpretation
            self._min_value = ds.pixel_array.min()
            self._max_value = ds.pixel_array.max()
            self._depth = ds.BitsStored

            logging.debug('File: {}'.format(filename))
            logging.debug('Photometric interpretation: {}'.format(self._photometric_interpretation))
            logging.debug('Min value: {}'.format(self._min_value))
            logging.debug('Max value: {}'.format(self._max_value))
            logging.debug('Depth: {}'.format(self._depth))

            try:
                self._length = ds["NumberOfFrames"].value
            except KeyError:
                self._length = 1

    def __len__(self):
        return self._length

    def __iter__(self):
        if self._length == 1:
            self._pixel_array = np.expand_dims(self._pixel_array, axis=0)

        for pixel_array in self._pixel_array:
            # Normalization to an output range 0..255, 0..65535
            pixel_array = pixel_array - self._min_value
            pixel_array = pixel_array.astype(int) * (2 ** self._depth - 1)
            pixel_array = pixel_array // (self._max_value - self._min_value)

            # In some cases we need to convert colors additionally
            if 'YBR' in self._photometric_interpretation:
                 pixel_array = convert_color_space(pixel_array, self._photometric_interpretation, 'RGB')

            if self._depth == 8:
                image = Image.fromarray(pixel_array.astype(np.uint8))
            elif self._depth == 16:
                image = Image.fromarray(pixel_array.astype(np.uint16))
            else:
                raise Exception('Not supported depth {}'.format(self._depth))

            yield image


def main(root_dir, output_root_dir):
    dicom_files = glob(os.path.join(root_dir, '**', '*.dcm'), recursive = True)
    if not len(dicom_files):
        logging.info('DICOM files are not found under the specified path')
    else:
        logging.info('Number of found DICOM files: ' + str(len(dicom_files)))

    pbar = tqdm(dicom_files)
    for input_filename in pbar:
        pbar.set_description('Conversion: ' + input_filename)
        input_basename = os.path.basename(input_filename)

        output_subpath = os.path.relpath(os.path.dirname(input_filename), root_dir)
        output_path = os.path.join(output_root_dir, output_subpath)
        output_basename = '{}.png'.format(os.path.splitext(input_basename)[0])
        output_filename = os.path.join(output_path, output_basename)

        if not os.path.exists(output_path):
            os.makedirs(output_path)

        try:
            iterated_converter = Converter(input_filename)
            length = len(iterated_converter)
            for i, image in enumerate(iterated_converter):
                if length == 1:
                    image.save(output_filename)
                else:
                    filename_index = str(i).zfill(len(str(length)))
                    list_output_filename = '{}_{}.png'.format(os.path.splitext(output_filename)[0], filename_index)
                    image.save(list_output_filename)
        except Exception as ex:
            logging.error('Error while processing ' + input_filename)
            logging.error(ex)

if __name__ == '__main__':
    input_root_path = os.path.abspath(args.input.rstrip(os.sep))
    output_root_path = os.path.abspath(args.output.rstrip(os.sep))

    logging.info('From: {}'.format(input_root_path))
    logging.info('To: {}'.format(output_root_path))
    main(input_root_path, output_root_path)
