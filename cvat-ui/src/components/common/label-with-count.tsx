// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';

export function LabelWithCountHOC(isBulkMode: boolean, selectedIds: (number | string)[], bulkKeys: string[]) {
    return (label: string, key: string, url?: string, EditLabelComponent?: any): React.ReactNode => {
        let result: React.ReactNode = label;

        if (isBulkMode && bulkKeys.includes(key)) {
            result = `${label} (${selectedIds.length})`;
        }
        if (url) {
            result = <Link to={url}>{result}</Link>;
        }
        if (key.includes('edit') && EditLabelComponent) {
            result = <EditLabelComponent>{result}</EditLabelComponent>;
        }
        return result;
    };
}
