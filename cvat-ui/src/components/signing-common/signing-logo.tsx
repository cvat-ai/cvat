// Copyright (C) SustAInLivWork
//
// SPDX-License-Identifier: MIT

import React from 'react';
import SVGSustAInLivWorkLockup from '../../assets/sustainlivwork-stacked.svg';

function SigningLogo(): JSX.Element {
    return (
        <div className='cvat-signing-logo'>
            <SVGSustAInLivWorkLockup />
        </div>
    );
}

export default React.memo(SigningLogo);
