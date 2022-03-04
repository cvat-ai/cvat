// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import _cvat from 'cvat-core/src/api';

const cvat: any = _cvat;

cvat.config.backendAPI = '/api';
cvat.config.origin = window.location.origin;
cvat.config.uploadChunkSize = 100;
(globalThis as any).cvat = cvat;

export default function getCore(): any {
    return cvat;
}
