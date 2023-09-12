// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import { Col, Row } from 'antd/lib/grid';
import Card from 'antd/lib/card';
import CVATTooltip from 'components/common/cvat-tooltip';
import { QuestionCircleOutlined } from '@ant-design/icons';

interface Props {
    title: string;
    size?: number;
    className?: string;
    value?: string | number;
    tooltip?: JSX.Element;
    bottomElement?: JSX.Element;
    rightElement?: JSX.Element;
    entryName?: string;
}

function AnalyticsCard(props: Props): JSX.Element {
    const {
        title, size, className, value, tooltip, bottomElement, rightElement, entryName,
    } = props;

    return (
        <Col span={size || 24} className={className || 'cvat-analytics-card'} data-entry-name={entryName}>
            <Card>
                <Row justify='space-between' align='middle'>
                    <Col>
                        <Row>
                            <Col>
                                <Text className='cvat-analytics-card-title'>
                                    {title}
                                </Text>
                                {
                                    tooltip && (
                                        <CVATTooltip title={tooltip} className='cvat-analytics-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                                            <QuestionCircleOutlined
                                                style={{ opacity: 0.5 }}
                                            />
                                        </CVATTooltip>
                                    )
                                }
                            </Col>
                        </Row>
                        <Row>
                            <Text className='cvat-analytics-card-value'>{value}</Text>
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

export default React.memo(AnalyticsCard);
