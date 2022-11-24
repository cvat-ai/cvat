// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useLocation } from 'react-router';

import { getCore } from '../../cvat-core-wrapper';

const cvat = getCore();

type AxiosRequestConfig = any;

export default function LoginWithSocialAppComponent(): JSX.Element {
    const location = useLocation();
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
                    state,
                },
            };
            cvat.server.request(`${cvat.config.backendAPI}/auth/${provider}/login/token`, req)
                .then((result: any) => {
                    localStorage.setItem('token', result.key);
                    return window.location.reload();
                })
                .catch((exception: Error) => Promise.reject(exception));
        }
    }, [provider, code, state]);

    return <></>;
}
