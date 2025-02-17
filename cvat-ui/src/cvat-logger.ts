// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { getCore } from 'cvat-core-wrapper';

const core = getCore();
const { logger } = core;
const { EventScope } = core.enums;

export default logger;
export { EventScope };
