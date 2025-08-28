// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import { check } from 'k6';
import { fail } from 'k6';

/**
 * Validates the HTTP response and logs detailed information if validation fails.
 *
 * @param {Object} response - The HTTP response object returned by k6 http request functions.
 * @param {number} expectedStatus - The expected HTTP status code.
 * @param {string} requestDescription - Short description of the request purpose (e.g., "Create task").
 */
export function validateResponse(response, expectedStatus, requestDescription) {
    const success = check(response, {
        [`${requestDescription} - status ${expectedStatus}`]: (r) => r.status === expectedStatus,
    });

    if (!success) {
        console.error(`>-------------------------------------------------------------`);
        console.error(` Request failed: ${requestDescription}`);
        console.error(` Expected status: ${expectedStatus}, got: ${response.status}`);
        console.error(` Request details:`);
        console.error(` Method: ${response.request.method}`);
        console.error(` URL: ${response.request.url}`);
        console.error(` Headers: ${JSON.stringify(response.request?.headers || {}, null, 2)}`);
        console.error(` Body: ${response.request?.body || 'no body'}`);
        console.error(` Response body: ${response.body}`);
        fail(`${requestDescription} failed. Expected status ${expectedStatus}, got ${response.status}`);
    }
    return success
}
