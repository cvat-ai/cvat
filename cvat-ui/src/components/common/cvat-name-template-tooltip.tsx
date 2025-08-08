// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

interface NameTemplateTooltipProps {
    example: string;
}

function NameTemplateTooltip({ example }: NameTemplateTooltipProps) {
    return (
        <>
            You can use the template:
            <ul style={{ marginBottom: 0 }}>
                <li>
                    <code>{'{{id}}'}</code>
                    <br />
                    - resource id
                </li>
                <li>
                    <code>{'{{name}}'}</code>
                    <br />
                    - resource name
                </li>
                <li>
                    <code>{'{{index}}'}</code>
                    <br />
                    - index in selection
                </li>
            </ul>
            <div>
                Example:
                <br />
                <i>{example}</i>
            </div>
        </>
    );
}

export default React.memo(NameTemplateTooltip);
