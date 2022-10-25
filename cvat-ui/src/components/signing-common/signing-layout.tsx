// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Layout from 'antd/lib/layout';
import { Col, Row } from 'antd/lib/grid';
import { CVATMinimalisticLogo } from 'icons';
import Icon from '@ant-design/icons';
import Title from 'antd/lib/typography/Title';
import SVGSigningBackground from '../../assets/signing-background.svg';

interface SignInLayoutComponentProps {
    children: JSX.Element | JSX.Element[];
}

function SignInLayout(props: SignInLayoutComponentProps): JSX.Element {
    const { children } = props;
    const { Content, Header } = Layout;
    return (
        <Layout>
            <SVGSigningBackground className='cvat-signing-background' />
            <Header className='cvat-signing-header'>
                <Icon className='cvat-logo-icon' component={CVATMinimalisticLogo} />
            </Header>
            <Layout>
                <Content>
                    <Row justify='center' align='middle' style={{ height: '100%' }}>
                        <Col span={12} className='cvat-signing-title'>
                            <Title>Open Data</Title>
                            <Title>Annotation Platform</Title>
                        </Col>
                        {children}
                    </Row>
                </Content>
            </Layout>
        </Layout>
    );
}

export default SignInLayout;
