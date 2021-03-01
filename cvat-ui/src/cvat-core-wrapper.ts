// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import _cvat from 'cvat-core/src/api';

const cvat: any = _cvat;

cvat.config.backendAPI =
    typeof process.env.REACT_APP_API_URL === 'undefined' ? '/api/v1' : `${process.env.REACT_APP_API_URL}/api/v1`;

export default function getCore(): any {
    return cvat;
}
