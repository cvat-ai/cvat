// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { RightOutlined } from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';

import './styles.scss';

interface CVATMenuEditLabelProps {
    children: React.ReactNode;
}

export function CVATMenuEditLabel(props: CVATMenuEditLabelProps): JSX.Element {
    const { children } = props;
    return (
        <div className='cvat-menu-edit-label'>
            <Text>{children}</Text>
            <RightOutlined />
        </div>
    );
}
