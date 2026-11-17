// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

declare module '*.svg';

declare module '*.webp' {
    const path: string;
    export default path;
}
