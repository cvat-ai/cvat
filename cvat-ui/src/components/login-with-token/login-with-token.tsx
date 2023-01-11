// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { Redirect, useParams, useLocation } from 'react-router';

export default function LoginWithTokenComponent(): JSX.Element {
    const location = useLocation();
    const { token } = useParams<{ token: string }>();

    const search = new URLSearchParams(location.search);

    useEffect(
        () => {
            localStorage.setItem('token', token);
            return () => window.location.reload();
        },
        [token],
    );

    if (token) {
        return <Redirect to={search.get('next') || '/tasks'} />;
    }
    return <></>;
}
