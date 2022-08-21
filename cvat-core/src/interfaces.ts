// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { StorageLocation } from './enums';

export interface Storage {
    location: StorageLocation;
    cloudStorageId?: number;
}
