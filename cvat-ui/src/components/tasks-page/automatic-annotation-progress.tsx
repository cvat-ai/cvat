// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Progress from 'antd/lib/progress';
import Tooltip from 'antd/lib/tooltip';
import Icon from 'antd/lib/icon';
import Modal from 'antd/lib/modal';
import { ActiveInference } from 'reducers/interfaces';

interface Props {
    activeInference: ActiveInference | null;
    cancelAutoAnnotation(): void;
}

export default function AutomaticAnnotationProgress(props: Props): JSX.Element | null {
    const { activeInference, cancelAutoAnnotation } = props;
    if (!activeInference) return null;

    return (
        <>
            <Row>
                <Col>
                    <Text strong>Automatic annotation</Text>
                </Col>
            </Row>
            <Row type='flex' justify='space-between'>
                <Col span={22}>
                    <Progress
                        percent={Math.floor(activeInference.progress)}
                        strokeColor={{
                            from: '#108ee9',
                            to: '#87d068',
                        }}
                        showInfo={false}
                        strokeWidth={5}
                        size='small'
                    />
                </Col>
                <Col span={1} className='close-auto-annotation-icon'>
                    <Tooltip title='Cancel automatic annotation' mouseLeaveDelay={0}>
                        <Icon
                            type='close'
                            onClick={() => {
                                Modal.confirm({
                                    title: 'You are going to cancel automatic annotation?',
                                    content: 'Reached progress will be lost. Continue?',
                                    okType: 'danger',
                                    onOk() {
                                        cancelAutoAnnotation();
                                    },
                                });
                            }}
                        />
                    </Tooltip>
                </Col>
            </Row>
        </>
    );
}
