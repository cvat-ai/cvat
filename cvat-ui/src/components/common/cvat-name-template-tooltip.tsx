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
            您可以使用模板：
            <ul style={{ marginBottom: 0 }}>
                <li>
                    <code>{'{{id}}'}</code>
                    <br />
                    - 资源 ID
                </li>
                <li>
                    <code>{'{{name}}'}</code>
                    <br />
                    - 资源名称
                </li>
                <li>
                    <code>{'{{index}}'}</code>
                    <br />
                    - 选择中的索引
                </li>
            </ul>
            <div>
                示例：
                <br />
                <i>{example}</i>
            </div>
        </>
    );
}

export default React.memo(NameTemplateTooltip);
