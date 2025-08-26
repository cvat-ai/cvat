// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="k6"/>

import type { Options } from 'k6/options';
import APIProjects from '../../libs/api/projects.js';
import APIAuth from '../../libs/api/auth.js';
import { ADMIN_PASSWORD, ADMIN_USERNAME } from '../../variables/constants.js';

export const options: Options = {
    scenarios: {
        "test": {
            executor: 'constant-arrival-rate',
            duration: '30s',
            rate: 5,
            timeUnit: '1s',
            preAllocatedVUs: 10,
            maxVUs: 100
        }
    }
}

export function setup(){
    const token = APIAuth.login(ADMIN_USERNAME, ADMIN_PASSWORD);
    const createdProject =
}

