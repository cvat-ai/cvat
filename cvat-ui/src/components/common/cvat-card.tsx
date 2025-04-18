// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import { Col, Row } from 'antd/lib/grid';
import Card from 'antd/lib/card';
import { QuestionCircleOutlined } from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    title: string;
    size?: {
        cardSize?: number;
        leftElementSize?: number;
    };
    className?: string;
    value?: string | number;
    tooltip?: string | JSX.Element;
    bottomElement?: JSX.Element;
    rightElement?: JSX.Element;
    entryName?: string;
}

function CardComponent(props: Props): JSX.Element {
    const {
        title, size, className, value, tooltip, bottomElement, rightElement, entryName,
    } = props;

    return (
        <Col span={size?.cardSize ?? 24} className={className ?? 'cvat-card'} data-entry-name={entryName}>
            <Card className='cvat-card-holder'>
                <Row justify='space-between' align='middle'>
                    <Col span={size?.leftElementSize}>
                        <Row>
                            <Col>
                                <Text className='cvat-card-title'>
                                    {title}
                                </Text>
                                {
                                    tooltip && (
                                        <CVATTooltip title={tooltip} className='cvat-card-tooltip' overlayStyle={{ maxWidth: '800px' }}>
                                            <QuestionCircleOutlined
                                                style={{ opacity: 0.5 }}
                                            />
                                        </CVATTooltip>
                                    )
                                }
                            </Col>
                        </Row>
                        <Row>
                            <Text className='cvat-card-value'>{value}</Text>
                        </Row>
                        {bottomElement}
                    </Col>
                    {
                        rightElement && <Col>{rightElement}</Col>
                    }
                </Row>
            </Card>
        </Col>
    );
}

export default React.memo(CardComponent);
