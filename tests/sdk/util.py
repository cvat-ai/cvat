# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from tqdm import tqdm

from cvat_sdk.impl.progress import TqdmProgressReporter


def make_pbar(file, **kwargs):
    return TqdmProgressReporter(tqdm(file=file, mininterval=0, **kwargs))
