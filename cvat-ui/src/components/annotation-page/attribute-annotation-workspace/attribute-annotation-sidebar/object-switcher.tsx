// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import Button from 'antd/lib/button';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';

import { useTranslation } from 'react-i18next';
import i18n from 'i18n';
import { localeOptions } from 'i18n/config';

const { t } = useTranslation('base');

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
            <CVATTooltip title={t(`Previous object ${normalizedKeyMap.PREVIOUS_OBJECT}`)}>
                <Button
                    className='cvat-attribute-annotation-sidebar-object-switcher-left'
                    disabled={objectsCount <= 1}
                    onClick={() => nextObject(-1)}
                >
                    <LeftOutlined />
                </Button>
            </CVATTooltip>
            <CVATTooltip title={t(title)}>
                <Text className='cvat-text'>{currentLabel}</Text>
                <Text className='cvat-text'>{` ${clientID} `}</Text>
                <Text strong>{`[${currentIndex + 1}/${objectsCount}]`}</Text>
            </CVATTooltip>
            <CVATTooltip title={t(`Next object ${normalizedKeyMap.NEXT_OBJECT}`)}>
                <Button
                    className='cvat-attribute-annotation-sidebar-object-switcher-right'
                    disabled={objectsCount <= 1}
                    onClick={() => nextObject(1)}
                >
                    <RightOutlined />
                </Button>
            </CVATTooltip>
        </div>
    );
}

export default React.memo(ObjectSwitcher);
