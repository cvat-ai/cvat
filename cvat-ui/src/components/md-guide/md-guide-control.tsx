// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React from 'react';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Button from 'antd/lib/button';

interface Props {
    instanceType: 'task' | 'project';
    id: number;
}

function MdGuideControl(props: Props): JSX.Element {
    const { instanceType, id } = props;
    const history = useHistory();

    return (
        <Row justify='start' className='cvat-md-guide-control-wrapper'>
            <Col span={24}>
                <Text strong className='cvat-text-color'>{`${instanceType === 'task' ? '任务' : '项目'}说明`}</Text>
                <br />
                <Button
                    onClick={() => {
                        history.push(`/${instanceType}s/${id}/guide`);
                    }}
                >
                    打开指南
                </Button>
            </Col>
        </Row>
    );
}

export default React.memo(MdGuideControl);

