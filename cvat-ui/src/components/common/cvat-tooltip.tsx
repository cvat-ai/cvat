// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Tooltip, { TooltipProps } from 'antd/lib/tooltip';

function CVATTooltip(props: TooltipProps): JSX.Element {
    const { children, ...rest } = props;

    return (
        <Tooltip destroyTooltipOnHide mouseEnterDelay={100} mouseLeaveDelay={0} {...rest}>
            {children}
        </Tooltip>
    );
}

export default React.memo(CVATTooltip);
