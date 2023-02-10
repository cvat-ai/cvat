// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Button from 'antd/lib/button/button';
import Tooltip from 'antd/lib/tooltip';
import { SocialAccountLinkProps } from './social-account-link';
import AuthenticationProviderIcon from './auth-provider-icon';

function SocialAccountCard(props: SocialAccountLinkProps): JSX.Element {
    const {
        children, className, href, icon,
    } = props;

    return (
        <Tooltip title={children}>
            <Button
                href={href}
                type='link'
                className={`cvat-social-authentication-link ${className}-button`}
            >
                {(icon) ? <AuthenticationProviderIcon iconData={icon} provider={children} /> : children}
            </Button>
        </Tooltip>
    );
}

export default React.memo(SocialAccountCard);
