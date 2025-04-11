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
    currentAttribute: string;
    currentIndex: number;
    attributesCount: number;
    normalizedKeyMap: Record<string, string>;
    nextAttribute(step: number): void;
}

function AttributeSwitcher(props: Props): JSX.Element {
    const {
        currentAttribute, currentIndex, attributesCount, nextAttribute, normalizedKeyMap,
    } = props;

    const title = `${currentAttribute} [${currentIndex + 1}/${attributesCount}]`;
    return (
        <div className='cvat-attribute-annotation-sidebar-attribute-switcher'>
            <CVATTooltip title={t(`Previous attribute ${normalizedKeyMap.PREVIOUS_ATTRIBUTE}`)}>
                <Button
                    className='cvat-attribute-annotation-sidebar-attribute-switcher-left'
                    disabled={attributesCount <= 1}
                    onClick={() => nextAttribute(-1)}
                >
                    <LeftOutlined />
                </Button>
            </CVATTooltip>
            <CVATTooltip title={t(title)}>
                <Text className='cvat-text'>{currentAttribute}</Text>
                <Text strong>{` [${currentIndex + 1}/${attributesCount}]`}</Text>
            </CVATTooltip>
            <CVATTooltip title={t(`Next attribute ${normalizedKeyMap.NEXT_ATTRIBUTE}`)}>
                <Button
                    className='cvat-attribute-annotation-sidebar-attribute-switcher-right'
                    disabled={attributesCount <= 1}
                    onClick={() => nextAttribute(1)}
                >
                    <RightOutlined />
                </Button>
            </CVATTooltip>
        </div>
    );
}

export default React.memo(AttributeSwitcher);
