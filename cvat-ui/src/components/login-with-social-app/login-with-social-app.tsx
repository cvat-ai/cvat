// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { Redirect, useParams, useLocation } from 'react-router';

import { getCore } from '../../cvat-core-wrapper';

const cvat = getCore();

type AxiosRequestConfig = any;

export default function LoginWithSocialAppComponent(): JSX.Element {
    const location = useLocation();
    const { provider, code, state } = useParams<{ provider: string, code: string, state: string }>();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const search = new URLSearchParams(location.search);

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
                });
        }
    }, [provider, code, state]);

    if (isAuthenticated) {
        return <Redirect to={search.get('next') || '/tasks'} />;
    }
    return <></>;
}
