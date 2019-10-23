import React from 'react';

import {
    Row,
    Col,
    Button,
} from 'antd';

import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';


export default function DetailsComponent() {
    const name = 'Cars on a road – tasks 1001-2000 (bounding box 3942035448539428-3482)';
    return (
        <div className='cvat-task-details'>
            <Row type='flex' justify='start' align='middle'>
                <Col>
                    <Title level={4} className='cvat-black-color'> {name} </Title>
                </Col>
            </Row>
            <Row type='flex' justify='space-between' align='middle'>
                <Col>
                    <Row>
                        <Col> Preview image </Col>
                    </Row>
                    <Row>
                        <Col> Parameters </Col>
                    </Row>
                </Col>
                <Col>
                    <Row type='flex' justify='space-between' align='middle'>
                        <Col> Created </Col>
                        <Col> Updated </Col>
                    </Row>
                    <Row>
                        <Col> Description </Col>
                    </Row>
                    <Row>
                        <Col> Dataset Repository </Col>
                    </Row>
                    <Row>
                        <Col> Bug tracker </Col>
                    </Row>
                    <Row>
                        <Col> Labels constructor </Col>
                    </Row>
                </Col>
            </Row>
        </div>
    );
}


// task instance
// task preview
// plugins

// todo: shared actions button
// todo: shared labels component