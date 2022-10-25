// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import './styles.scss';
import React from 'react';
import { Col, Row } from 'antd/lib/grid';
import Button from 'antd/lib/button/button';
import Icon from '@ant-design/icons';
import { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

interface SocialAccountLinkProps {
    children: string;
    className?: string;
    icon: React.ForwardRefExoticComponent<CustomIconComponentProps>;
}

function SocialAccountLink(props: SocialAccountLinkProps): JSX.Element {
    const { children, className, icon } = props;
    return (
        <Row>
            <Col flex='auto'>
                <Button
                    className={`cvat-social-authentication-button ${className}`}
                    onClick={() => {
                    }}
                >
                    <Row align='middle'>
                        <Col>
                            <Icon component={icon} />
                        </Col>
                        <Col flex='auto'>
                            {children}
                        </Col>
                    </Row>
                </Button>
            </Col>
        </Row>
    );
}

export default React.memo(SocialAccountLink);
