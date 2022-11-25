// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useLocation, useHistory } from 'react-router';
import notification from 'antd/lib/notification';

import { getCore } from '../../cvat-core-wrapper';

const cvat = getCore();

type AxiosRequestConfig = any;

export default function LoginWithSocialAppComponent(): JSX.Element {
    const location = useLocation();
    const history = useHistory();
    const search = new URLSearchParams(location.search);
    const provider = search.get('provider');
    const code = search.get('code');
    const state = search.get('state');

    useEffect(() => {
        if (provider && code && state) {
            const req: AxiosRequestConfig = {
                method: 'POST',
                data: {
                    code,
                },
            };
            cvat.server.request(
                `${cvat.config.backendAPI}/auth/${provider}/login/token?state=${state}`, req,
            )
                .then((result: any) => {
                    localStorage.setItem('token', result.key);
                    return window.location.reload();
                })
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
    }, [provider, code, state]);

    return <></>;
}
