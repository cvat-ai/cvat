# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp
import zipfile

import numpy as np
from PIL import Image

from cvat.apps.dataset_manager.bindings import (
    GetCVATDataExtractor,
    import_dm_annotations,
)
from cvat.apps.dataset_manager.util import make_zip_archive
from datumaro.components.dataset import Dataset

from .registry import dm_env, exporter, importer


def _convert_dicom_to_images(dicom_dir, output_dir):
    """Convert all DICOM files in a directory to PNG images.

    Returns list of created image paths.
    """
    import pydicom

    os.makedirs(output_dir, exist_ok=True)
    created = []

    for root, _dirs, files in os.walk(dicom_dir):
        for filename in sorted(files):
            if not filename.lower().endswith('.dcm'):
                continue

            filepath = osp.join(root, filename)
            try:
                ds = pydicom.dcmread(filepath)
                pixel_array = ds.pixel_array
            except Exception:
                continue

            samples = getattr(ds, 'SamplesPerPixel', 1)
            photometric = getattr(ds, 'PhotometricInterpretation', '')
            is_color = samples > 1

            # Convert YBR color space on raw data before any normalization.
            # Skip for JPEG-compressed transfer syntaxes — the JPEG decoder
            # already converts YBR to RGB during decompression.
            if is_color and 'YBR' in photometric:
                ts_uid = str(getattr(ds.file_meta, 'TransferSyntaxUID', ''))
                is_jpeg = ts_uid.startswith('1.2.840.10008.1.2.4.')
                if not is_jpeg:
                    from pydicom.pixel_data_handlers.util import convert_color_space
                    pixel_array = convert_color_space(pixel_array, photometric, 'RGB')

            pixel_array = pixel_array.astype(np.float64)

            # Apply rescale slope/intercept only for grayscale (CT/MRI Hounsfield units etc.)
            if not is_color:
                slope = float(getattr(ds, 'RescaleSlope', 1))
                intercept = float(getattr(ds, 'RescaleIntercept', 0))
                pixel_array = pixel_array * slope + intercept

            # Extract individual slices/frames
            expected_ndim = 2 if not is_color else 3

            slices = []
            if pixel_array.ndim == expected_ndim:
                slices = [pixel_array]
            elif pixel_array.ndim > expected_ndim:
                flat = pixel_array.reshape(-1, *pixel_array.shape[-(expected_ndim):])
                slices = [flat[i] for i in range(flat.shape[0])]
            else:
                slices = [pixel_array]

            basename = osp.splitext(filename)[0]
            num_digits = len(str(len(slices)))
            for idx, sl in enumerate(slices):
                vmin, vmax = sl.min(), sl.max()
                if vmax > vmin:
                    sl = (sl - vmin) / (vmax - vmin) * 255
                sl = sl.astype(np.uint8)

                suffix = f'_{str(idx).zfill(num_digits)}' if len(slices) > 1 else ''
                out_path = osp.join(output_dir, f'{basename}{suffix}.png')
                Image.fromarray(sl).save(out_path)
                created.append(out_path)

    return created


@exporter(name='DICOM', ext='ZIP', version='1.0')
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.export(temp_dir, 'cvat', save_media=save_images)

    make_zip_archive(temp_dir, dst_file)


@importer(name='DICOM', ext='ZIP, DCM', version='1.0')
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    is_zip = zipfile.is_zipfile(src_file)
    if hasattr(src_file, 'seek'):
        src_file.seek(0)

    if is_zip:
        zipfile.ZipFile(src_file).extractall(temp_dir)
        dicom_dir = temp_dir
    else:
        # Single .dcm file
        dicom_dir = temp_dir
        os.makedirs(dicom_dir, exist_ok=True)
        src_name = getattr(src_file, 'name', 'input.dcm')
        dst_path = osp.join(dicom_dir, osp.basename(src_name))
        if hasattr(src_file, 'read'):
            with open(dst_path, 'wb') as f:
                f.write(src_file.read())
        else:
            import shutil
            shutil.copy2(str(src_file), dst_path)

    images_dir = osp.join(temp_dir, 'images')
    created_images = _convert_dicom_to_images(dicom_dir, images_dir)

    if not created_images:
        raise Exception('No valid DICOM files found in the uploaded data')

    dataset = Dataset.import_from(images_dir, 'image_dir', env=dm_env)

    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
