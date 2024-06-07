// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import Spin from 'antd/lib/spin';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';

import { saveLogsAsync } from 'actions/annotation-actions';
import { logoutAsync } from 'actions/auth-actions';

function LogoutComponent(): JSX.Element {
    const dispatch = useDispatch();
    const history = useHistory();

    useEffect(() => {
        dispatch(saveLogsAsync()).then(() => {
            // a way to avoid saving /auth/logout in `next` query parameter
            history.goBack();
            dispatch(logoutAsync());
        });
    }, []);

    return (
        <div className='cvat-logout-page cvat-spinner-container'>
            <Spin className='cvat-spinner' />
        </div>
    );
}

export default React.memo(LogoutComponent);
