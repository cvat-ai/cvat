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

interface Sizes {
    xs?: { span: number };
    sm?: { span: number };
    md?: { span: number };
    lg?: { span: number };
    xl?: { span: number };
    xxl?: { span: number };
}

interface FormSizes {
    wrapper: Sizes;
    form: Sizes;
}

export const formSizes: FormSizes = {
    wrapper: {
        xs: { span: 24 },
        sm: { span: 24 },
        md: { span: 24 },
        lg: { span: 24 },
        xl: { span: 14 },
        xxl: { span: 12 },
    },
    form: {
        xs: { span: 20 },
        sm: { span: 20 },
        md: { span: 20 },
        lg: { span: 20 },
        xl: { span: 18 },
        xxl: { span: 16 },
    },
};

function SignInLayout(props: SignInLayoutComponentProps): JSX.Element {
    const { children } = props;
    const { Content, Header } = Layout;
    const titleSizes = {
        xs: { span: 0 },
        sm: { span: 0 },
        md: { span: 0 },
        lg: { span: 0 },
        xl: { span: 8 },
        xxl: { span: 10 },
    };
    return (
        <Layout>
            <SVGSigningBackground className='cvat-signing-background' />
            <Header className='cvat-signing-header'>
                <Icon className='cvat-logo-icon' component={CVATMinimalisticLogo} />
            </Header>
            <Layout>
                <Content>
                    <Row justify='center' align='middle' style={{ height: '100%' }}>
                        <Col {...titleSizes} className='cvat-signing-title'>
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
