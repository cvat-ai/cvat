// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from 'antd/lib/icon';
import Text from 'antd/lib/typography/Text';
import Tooltip from 'antd/lib/tooltip';
import Button from 'antd/lib/button';

interface Props {
    currentLabel: string;
    clientID: number;
    occluded: boolean;
    objectsCount: number;
    currentIndex: number;
    nextObject(step: number): void;
}

function ObjectSwitcher(props: Props): JSX.Element {
    const {
        currentLabel,
        clientID,
        objectsCount,
        currentIndex,
        nextObject,
    } = props;


    const title = `${currentLabel} ${clientID} [${currentIndex + 1}/${objectsCount}]`;
    return (
        <div className='attribute-annotation-sidebar-switcher'>
            <Button disabled={objectsCount <= 1} onClick={() => nextObject(-1)}>
                <Icon type='left' />
            </Button>
            <Tooltip title={title}>
                <Text className='cvat-text'>{currentLabel}</Text>
                <Text className='cvat-text'>{` ${clientID} `}</Text>
                <Text strong>{`[${currentIndex + 1}/${objectsCount}]`}</Text>
            </Tooltip>
            <Button disabled={objectsCount <= 1} onClick={() => nextObject(1)}>
                <Icon type='right' />
            </Button>
        </div>
    );
}

export default React.memo(ObjectSwitcher);
