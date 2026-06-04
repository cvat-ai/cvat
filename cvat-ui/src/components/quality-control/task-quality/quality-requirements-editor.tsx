// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { BuildOutlined, EditOutlined } from '@ant-design/icons';
import Tabs from 'antd/lib/tabs';
import Text from 'antd/lib/typography/Text';
import { QualitySettings } from 'cvat-core-wrapper';
import QualityRequirementsConstructor from './quality-requirements-constructor';
import QualityRequirementsRaw from './quality-requirements-raw';

interface Props {
    settings: QualitySettings;
    disabled: boolean;
    onReload: () => Promise<void>;
}

export default function QualityRequirementsEditor(props: Readonly<Props>): JSX.Element {
    const {
        settings,
        disabled,
        onReload,
    } = props;

    return (
        <Tabs
            className='cvat-quality-requirements-editor'
            defaultActiveKey='constructor'
            type='card'
            items={[{
                key: 'raw',
                label: (
                    <span>
                        <EditOutlined />
                        <Text>Raw</Text>
                    </span>
                ),
                children: (
                    <QualityRequirementsRaw
                        settings={settings}
                        disabled={disabled}
                        onReload={onReload}
                    />
                ),
            }, {
                key: 'constructor',
                label: (
                    <span>
                        <BuildOutlined />
                        <Text>Constructor</Text>
                    </span>
                ),
                children: (
                    <QualityRequirementsConstructor
                        settings={settings}
                        disabled={disabled}
                        onReload={onReload}
                    />
                ),
            }]}
        />
    );
}
