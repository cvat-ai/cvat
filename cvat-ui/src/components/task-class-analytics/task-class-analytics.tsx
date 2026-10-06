import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';

interface RouteParams {
    tid: string;
}

export default function TaskClassAnalyticsPage(): JSX.Element {
    const { tid } = useParams<RouteParams>();
    
    return (
        <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
            <Col>
                <Text>Class Analytics for Task {tid} coming soon!</Text>
            </Col>
        </Row>
    );
}
