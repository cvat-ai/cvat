// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import UserInfoCard from './user-info-card';

function ProfileContent(): JSX.Element {
    return (
        <div className='cvat-profile-content'>
            <UserInfoCard />
        </div>
    );
}

export default React.memo(ProfileContent);
