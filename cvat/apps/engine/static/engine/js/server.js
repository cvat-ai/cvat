/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported encodeFilePathToURI */

function encodeFilePathToURI(path) {
    return path.split('/').map(x => encodeURIComponent(x)).join('/');
}
