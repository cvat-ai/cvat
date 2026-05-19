// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';

export function LabelWithCountHOF<T>(
    selectedIds: (number | string)[],
    bulkKeys: string[],
    instances?: Record<string, T[]>,
) {
    return (label: string, key: string, url?: string): React.ReactNode => {
        let result: React.ReactNode = label;

        const isBulkMode = selectedIds.length > 1;

        if (isBulkMode && bulkKeys.includes(key)) {
            if (instances) {
                result = `${label} (${instances[key].length})`;
            } else {
                result = `${label} (${selectedIds.length})`;
            }
        }
        if (url) {
            result = <Link to={url}>{result}</Link>;
        }

        return result;
    };
}
