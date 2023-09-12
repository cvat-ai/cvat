// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import LoadingSpinner from 'components/common/loading-spinner';
import { useParams, useLocation } from 'react-router';

export default function LoginWithTokenComponent(): JSX.Element {
    const location = useLocation();
    const { token } = useParams<{ token: string }>();
    const search = new URLSearchParams(location.search);

    useEffect(
        () => {
            localStorage.setItem('token', token);
            const next = search.get('next');
            if (next) {
                (window as Window).location = next;
            } else {
                window.location.reload();
            }
        },
        [token],
    );

    return (<LoadingSpinner />);
}
