// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { ExtendedKeyMapOptions } from 'react-hotkeys';
import Icon from 'antd/lib/icon';
import Text from 'antd/lib/typography/Text';
import Tooltip from 'antd/lib/tooltip';
import Button from 'antd/lib/button';

import { formatShortcuts } from 'utils/shortcuts';

interface Props {
    currentAttribute: string;
    currentIndex: number;
    attributesCount: number;
    keyMap: Record<string, ExtendedKeyMapOptions>;
    nextAttribute(step: number): void;
}

function AttributeSwitcher(props: Props): JSX.Element {
    const {
        currentAttribute,
        currentIndex,
        attributesCount,
        nextAttribute,
        keyMap,
    } = props;

    const title = `${currentAttribute} [${currentIndex + 1}/${attributesCount}]`;
    return (
        <div className='attribute-annotation-sidebar-switcher'>
            <Tooltip title={`Previous attribute ${formatShortcuts(keyMap.PREVIOUS_ATTRIBUTE)}`}>
                <Button disabled={attributesCount <= 1} onClick={() => nextAttribute(-1)}>
                    <Icon type='left' />
                </Button>
            </Tooltip>
            <Tooltip title={title}>
                <Text className='cvat-text'>{currentAttribute}</Text>
                <Text strong>{` [${currentIndex + 1}/${attributesCount}]`}</Text>
            </Tooltip>
            <Tooltip title={`Next attribute ${formatShortcuts(keyMap.NEXT_ATTRIBUTE)}`}>
                <Button disabled={attributesCount <= 1} onClick={() => nextAttribute(1)}>
                    <Icon type='right' />
                </Button>
            </Tooltip>
        </div>
    );
}

export default React.memo(AttributeSwitcher);
