// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import PaidFeaturePlaceholder from 'components/customizable-components/paid-feature-placeholder/paid-feature-placeholder';
import AllocationTable from 'components/quality-control/task-quality/allocation-table';
import config from 'config';

const storage = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    QUALITY_CONTROL_OVERVIEW: [(_: any) => (
        <PaidFeaturePlaceholder featureDescription={config.PAID_PLACEHOLDER_CONFIG.features.qualityControl} />
    )],

    QUALITY_CONTROL_ALLOCATION_TABLE: [AllocationTable],
};

export default storage;
