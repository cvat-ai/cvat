// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import './styles.scss';
import React from 'react';
import { Col, Row } from 'antd/lib/grid';
import Button from 'antd/lib/button/button';

interface SocialAccountLinkProps {
    children: string;
    className?: string;
    href: string;
    icon: string;
}

function SocialAccountLink(props: SocialAccountLinkProps): JSX.Element {
    const svgWrapperRef = React.useRef();
    const {
        children, className, href, icon,
    } = props;

    React.useEffect(() => {
        if (icon) {
            // eslint-disable-next-line no-unsanitized/property
            svgWrapperRef.current.innerHTML = icon;
        }
    }, [icon, svgWrapperRef.current]);

    return (
        <Row>
            <Col flex='auto'>
                <Button
                    href={href}
                    className={`cvat-social-authentication-button ${className}`}
                >
                    <Row align='middle' style={{ width: '100%' }}>
                        <Col>
                            <div
                                ref={svgWrapperRef as any}
                                className='cvat-social-authentication-icon'
                            />
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
