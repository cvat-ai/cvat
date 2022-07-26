# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat_sdk.impl.progress import TqdmProgressReporter
from tqdm import tqdm


def make_pbar(file, **kwargs):
    return TqdmProgressReporter(tqdm(file=file, mininterval=0, **kwargs))
