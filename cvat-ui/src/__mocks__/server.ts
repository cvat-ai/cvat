// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// This configures a request mocking server with the given request handlers
export const server = setupServer(...handlers);
