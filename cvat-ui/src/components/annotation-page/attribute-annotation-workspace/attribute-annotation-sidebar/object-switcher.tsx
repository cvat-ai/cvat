// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import Tooltip from 'antd/lib/tooltip';
import Button from 'antd/lib/button';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

interface Props {
    currentLabel: string;
    clientID: number;
    occluded: boolean;
    objectsCount: number;
    currentIndex: number;
    normalizedKeyMap: Record<string, string>;
    nextObject(step: number): void;
}

function ObjectSwitcher(props: Props): JSX.Element {
    const {
        currentLabel, clientID, objectsCount, currentIndex, nextObject, normalizedKeyMap,
    } = props;

    const title = `${currentLabel} ${clientID} [${currentIndex + 1}/${objectsCount}]`;
    return (
        <div className='cvat-attribute-annotation-sidebar-object-switcher'>
            <Tooltip title={`Previous object ${normalizedKeyMap.PREVIOUS_OBJECT}`} mouseLeaveDelay={0}>
<Button className='cvat-attribute-annotation-sidebar-object-switcher-left' disabled={objectsCount <= 1} onClick={() => nextObject(-1)}>
                    <LeftOutlined />
                </Button>
            </Tooltip>
            <Tooltip title={title} mouseLeaveDelay={0}>
                <Text className='cvat-text'>{currentLabel}</Text>
                <Text className='cvat-text'>{` ${clientID} `}</Text>
                <Text strong>{`[${currentIndex + 1}/${objectsCount}]`}</Text>
            </Tooltip>
            <Tooltip title={`Next object ${normalizedKeyMap.NEXT_OBJECT}`} mouseLeaveDelay={0}>
                <Button className='cvat-attribute-annotation-sidebar-object-switcher-right' disabled={objectsCount <= 1} onClick={() => nextObject(1)}>
                    <RightOutlined />
                </Button>
            </Tooltip>
        </div>
    );
}

export default React.memo(ObjectSwitcher);
