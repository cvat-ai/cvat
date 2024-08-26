// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import Card from 'antd/es/card/Card';
import PaidFeaturePlaceholderImg from 'assets/paid-feature.png';
import { Row, Col } from 'antd/es/grid';

import './styles.scss';
import { Button } from 'antd';
import CVATMarkdown from 'components/common/cvat-markdown';
import config from 'config';

interface Props {
    featureDescription: string;
}

export default function PaidFeaturePlaceholder(props: Props): JSX.Element | null {
    const {
        featureDescription,
    } = props;

    const { PAID_PLACEHOLDER_CONFIG } = config;
    const { url } = PAID_PLACEHOLDER_CONFIG;

    return (
        <div className='cvat-paid-feature-placeholder-wrapper'>
            <Card
                className='cvat-paid-feature-placeholder'
                cover={<img src={PaidFeaturePlaceholderImg} alt='some text' />}
            >
                <Row className='cvat-paid-feature-placeholder-inner-wrapper'>
                    <Col span={24}>
                        <Row justify='center'>
                            <Col className='cvat-paid-feature-placeholder-title'>
                                <Text>
                                    You discovered a premium feature
                                </Text>
                            </Col>
                        </Row>
                        <Row justify='center'>
                            <Col className='cvat-paid-feature-placeholder-description'>
                                <CVATMarkdown>
                                    {featureDescription}
                                </CVATMarkdown>
                            </Col>
                        </Row>
                    </Col>
                    <Col span={24}>
                        <Row justify='center'>
                            <Col className='cvat-paid-feature-placeholder-pricing'>
                                <Button
                                    type='primary'
                                    onClick={(event: React.MouseEvent): void => {
                                        event.preventDefault();
                                        window.open(url, '_blank');
                                    }}
                                >
                                    Check pricing
                                </Button>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Card>
        </div>
    );
}
