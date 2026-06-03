// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/**
 * EXAMPLE CUSTOM CONFIG FILE
 *
 * This is an example of how to create a custom config file for CVAT UI.
 * To use this config:
 *
 * 1. Copy this file to config.custom.tsx:
 *    cp cvat-ui/src/config.example.tsx cvat-ui/src/config.custom.tsx
 *
 * 2. Edit config.custom.tsx with your custom settings
 *
 * 3. Build with custom config:
 *    UI_APP_CONFIG=./src/config.custom.tsx yarn run build
 *
 * OR simply edit cvat-ui/src/config.tsx directly and rebuild.
 */

import React from 'react';

// ... (copy all constants from config.tsx)

// EXAMPLE: Customize Feature Flags
const FEATURE_FLAGS = {
    // Hide delete/restore frame buttons (read-only mode)
    DELETE_FRAME_ALLOWED: false,

    // Add more feature flags as needed
};

// Export configuration
export default {
    // ... (export all constants)
    FEATURE_FLAGS,
};
