// Copyright (C) 2023 CVAT.ai Corp
//
// SPDX-License-Identifier: MIT

import React from 'react';
import consts from 'consts';

const { UPGRADE_GUIDE_URL } = consts;

const SERVER_UNAVAILABLE = (
    <>
        Make sure the CVAT backend and all necessary services
        (Database, Redis and Open Policy Agent) are running and avaliable.
        If you upgraded from version 2.2.0 or earlier, manual actions may be needed,
        see the&nbsp;
        <a
            target='_blank'
            rel='noopener noreferrer'
            href={UPGRADE_GUIDE_URL}
        >
            Upgrade Guide
        </a>
        .
    </>
);

export default {
    SERVER_UNAVAILABLE,
};
