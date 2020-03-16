// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from 'antd/lib/icon';
import Text from 'antd/lib/typography/Text';
import Tooltip from 'antd/lib/tooltip';
import Button from 'antd/lib/button';

interface Props {
    currentAttribute: string;
    currentIndex: number;
    attributesCount: number;
    nextAttribute(step: number): void;
}

function AttributeSwitcher(props: Props): JSX.Element {
    const {
        currentAttribute,
        currentIndex,
        attributesCount,
        nextAttribute,
    } = props;

    const title = `${currentAttribute} [${currentIndex + 1}/${attributesCount}]`;
    return (
        <div className='attribute-annotation-sidebar-switcher'>
            <Button disabled={attributesCount <= 1} onClick={() => nextAttribute(-1)}>
                <Icon type='left' />
            </Button>
            <Tooltip title={title}>
                <Text className='cvat-text'>{currentAttribute}</Text>
                <Text strong>{` [${currentIndex + 1}/${attributesCount}]`}</Text>
            </Tooltip>
            <Button disabled={attributesCount <= 1} onClick={() => nextAttribute(1)}>
                <Icon type='right' />
            </Button>
        </div>
    );
}

export default React.memo(AttributeSwitcher);
