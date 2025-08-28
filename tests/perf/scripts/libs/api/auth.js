// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import http from 'k6/http';
import { BASE_URL } from '../../variables/constants.js';
import { validateResponse } from '../../utils/validation.js';

function login(username, password) {
    const response = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        username,
        password,
    }),
        {
            headers: {
                'Content-Type': 'application/json',
            },
        });
    if (validateResponse(response, 200, "Authentication")) {
        return response.json().key;
    }
}

export default { login };
