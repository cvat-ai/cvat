// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: LicenseRef-CVAT-AI-Commercial

import React from 'react';

import config from './config';

config.SERVER_UNAVAILABLE_COMPONENT = (
    <>
        Please contact CVAT team
        {' '}
        <a href='mailto:support@cvat.ai'>support@cvat.ai</a>
.
    </>
);

export default {
    ...config,
};
