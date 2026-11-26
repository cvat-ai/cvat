// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { CachePlugin } from './types';

const cacheState: CachePlugin['data'] = {
    core: null,
    enabled: window.isSecureContext && ['true', null].includes(window.localStorage.getItem('cvatEnableCacheFeature')),
    cachedChunksByJob: {},
};

export default cacheState;
