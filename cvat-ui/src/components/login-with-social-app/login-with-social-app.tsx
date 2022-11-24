// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { Redirect, useLocation } from 'react-router';

import { getCore } from '../../cvat-core-wrapper';

const cvat = getCore();

type AxiosRequestConfig = any;

export default function LoginWithSocialAppComponent(): JSX.Element {
    const location = useLocation();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const search = new URLSearchParams(location.search);
    const provider = search.get('provider');
    const code = search.get('code');
    const state = search.get('state');
    console.log('values: ', provider, code, state);

    useEffect(() => {
        if (provider && code && state) {
            const req: AxiosRequestConfig = {
                method: 'POST',
                data: {
                    code,
                    state,
                },
                // headers: {}.
            };
            cvat.server.request(`${cvat.config.backendAPI}/auth/${provider}/login/token`, req)
                .then((result: any) => {
                    console.log('result:', result);
                    localStorage.setItem('token', result.key);
                    setIsAuthenticated(true);
                })
                .catch((exception: Error) => Promise.reject(exception));
        }
    }, [provider, code, state]);

    if (isAuthenticated) {
        return <Redirect to={search.get('next') || '/tasks'} />;
    }
    return <></>;
}
