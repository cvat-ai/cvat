// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="k6"/>

import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from '../../variables/constants.js';

function login(username, password) {
    const response = http.post(`${BASE_URL}auth/login`, JSON.stringify({
        username,
        password,
    }),
    {
        headers: {
            'Content-Type': 'application/json',
        },
    });
    check(response, {
        'is status 200': (r) => r.status === 200,
    });
    return response.json().key;
}

export default { login };
