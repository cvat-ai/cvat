// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { RQStatus } from './enums';

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

    requestsStatusDelays: (window as any).Cypress ? {
        [RQStatus.STARTED]: [1000],
        [RQStatus.QUEUED]: [1000],
    } : {
        [RQStatus.STARTED]: [3000, 7000, 13000],
        [RQStatus.QUEUED]: [7000, 13000, 19000, 29000,
            41000, 53000, 67000, 79000,
            101000, 113000, 139000, 163000],
    },
};

export default config;
