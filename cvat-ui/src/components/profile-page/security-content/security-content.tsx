// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import PasswordChangeCard from './password-change-card';
import ApiTokensCard from './api-tokens-card';

interface Props {
    isPasswordChangeEnabled: boolean;
}

function SecurityContent({ isPasswordChangeEnabled }: Props): JSX.Element {
    return (
        <div className='cvat-security-content'>
            {isPasswordChangeEnabled && <PasswordChangeCard />}
            <ApiTokensCard />
        </div>
    );
}

export default React.memo(SecurityContent);
