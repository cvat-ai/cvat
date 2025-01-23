// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import Card from 'antd/es/card/Card';
import Button from 'antd/lib/button';
import { Row, Col } from 'antd/es/grid';

import './styles.scss';
import CVATMarkdown from 'components/common/cvat-markdown';
import config from 'config';

interface Props {
    featureDescription: string;
}

function PaidFeaturePlaceholder(props: Readonly<Props>): JSX.Element | null {
    const { featureDescription } = props;

    const { PAID_PLACEHOLDER_CONFIG } = config;
    const { url } = PAID_PLACEHOLDER_CONFIG;

    return (
        <div className='cvat-paid-feature-placeholder-wrapper'>
            <Card
                className='cvat-paid-feature-placeholder'
                cover={<img src='/assets/paid-feature.png' alt='some text' />}
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

export default React.memo(PaidFeaturePlaceholder);
