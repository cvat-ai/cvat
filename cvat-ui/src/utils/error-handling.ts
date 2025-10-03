// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export function ensureError(error: unknown): Error {
    if (error instanceof Error) {
        return error;
    }

    if (typeof error === 'string') {
        return new Error(error);
    }

    if (error && typeof error === 'object') {
        const message = 'message' in error && typeof error.message === 'string' ?
            error.message :
            JSON.stringify(error);
        return new Error(message);
    }

    return new Error(String(error));
}
