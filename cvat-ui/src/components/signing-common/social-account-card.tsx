// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Button from 'antd/lib/button/button';
import Tooltip from 'antd/lib/tooltip';
import { SocialAccountLinkProps } from './social-account-link';

function SocialAccountCard(props: SocialAccountLinkProps): JSX.Element {
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
        <Tooltip title={children}>
            <Button
                href={href}
                type='link'
                className={`cvat-social-authentication-link ${className}-button`}
            >
                <div
                    ref={svgWrapperRef as any}
                    className='cvat-social-authentication-icon'
                />
            </Button>
        </Tooltip>
    );
}

export default React.memo(SocialAccountCard);
