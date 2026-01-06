// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Col, Row } from 'antd/lib/grid';
import Layout from 'antd/lib/layout';
import Statistic from 'antd/lib/statistic';
import './styles.scss';

const { Content } = Layout;
const { Countdown } = Statistic;

/**
 * Component for displaying email confirmation message and then redirecting to the login page
 */

function EmailConfirmationPage(): JSX.Element {
    const linkRef = useRef<HTMLAnchorElement>(null);
    const onFinish = (): void => {
        linkRef.current?.click();
    };
    return (
        <Layout>
            <Content>
                <Row justify='center' align='middle' id='email-confirmation-page-container'>
                    <Col>
                        <h1>您的邮箱已确认</h1>
                        <Countdown format='ss' title='正在跳转到登录页面...' value={Date.now() + 1000 * 6} onFinish={onFinish} />
                        <Link to='/auth/login' ref={linkRef}>或点击此链接</Link>
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
}

export default EmailConfirmationPage;

