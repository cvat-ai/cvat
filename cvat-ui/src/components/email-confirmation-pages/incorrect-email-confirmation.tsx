// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Col, Row } from 'antd/lib/grid';
import Layout from 'antd/lib/layout';
import Button from 'antd/lib/button';
import './styles.scss';

const { Content } = Layout;

/**
 * Component for displaying message that email confirmation URL is incorrect
 */

export default function IncorrectEmailConfirmationPage(): JSX.Element {
    return (
        <Layout>
            <Content>
                <Row justify='center' align='middle' id='incorrect-email-confirmation-page-container'>
                    <Col>
                        <h1>
                            该邮箱确认链接已过期或无效。
                        </h1>
                        <p>
                            请重新发起邮箱确认请求。
                        </p>
                        <Button className='cvat-go-to-login-button' type='link' href='/auth/login'>
                            前往登录页
                        </Button>
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
}
