// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Divider from 'antd/lib/divider';
import { ExportOutlined, PlusOutlined } from '@ant-design/icons';

import './styles.scss';

export default function ModelSelectorDropdownContent({ children }: { children?: React.ReactNode }): JSX.Element {
    return (
        <>
            {children}
            {children && <Divider style={{ margin: '4px 0' }} />}
            <a
                href='https://docs.cvat.ai/docs/annotation/auto-annotation/ai-models/#native-functions'
                target='_blank'
                rel='noopener noreferrer'
                className='cvat-model-selector-add-model'
            >
                <PlusOutlined />
                <span>Add your own model</span>
                <ExportOutlined className='cvat-model-selector-external-link' />
            </a>
        </>
    );
}
