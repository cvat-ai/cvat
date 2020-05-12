// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Icon,
    Popover
} from 'antd';

import {
    SettingsIcon
} from 'icons';

import TrackSettingContainer from 'containers/annotation-page/standard-workspace/controls-side-bar/track-popover-control';

function TrackControl(): JSX.Element  {
    return (
        <Popover
            overlayClassName='cvat-draw-shape-popover'
            placement='right'
            content={(
                <TrackSettingContainer />
            )}
        >
            <Icon component={SettingsIcon} />
        </Popover>
    )
}

export default React.memo(TrackControl);