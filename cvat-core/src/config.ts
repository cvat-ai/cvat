// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const config = {
    backendAPI: '/api',
    organization: {
        organizationID: null,
        organizationSlug: null,
    },
    origin: '',
    uploadChunkSize: 100,
    removeUnderlyingMaskPixels: {
        enabled: false,
        onEmptyMaskOccurrence: null,
    },
    onOrganizationChange: null,
    globalObjectsCounter: 0,
};

export default config;
