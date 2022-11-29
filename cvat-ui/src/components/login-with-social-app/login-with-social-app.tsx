// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useLocation, useHistory } from 'react-router';
import notification from 'antd/lib/notification';
import Spin from 'antd/lib/spin';

import { getCore } from 'cvat-core-wrapper';

const cvat = getCore();

export default function LoginWithSocialAppComponent(): JSX.Element {
    const location = useLocation();
    const history = useHistory();
    const search = new URLSearchParams(location.search);

    useEffect(() => {
        const provider = search.get('provider');
        const code = search.get('code');
        const process = search.get('process');
        const scope = search.get('scope');
        const authParams = search.get('auth_params');

        if (provider && code) {
            cvat.server.loginWithSocialAccount(provider, code, authParams, process, scope)
                .then(() => window.location.reload())
                .catch((exception: Error) => {
                    if (exception.message.includes('Unverified email')) {
                        history.push('/auth/email-verification-sent');
                    }
                    history.push('/auth/login');
                    notification.error({
                        message: 'Could not log in with social account',
                        description: 'Go to developer console',
                    });
                    return Promise.reject(exception);
                });
        }
    }, []);

    return (
        <div className='cvat-login-page cvat-spinner-container'>
            <Spin size='large' className='cvat-spinner' />
        </div>
    );
}
