// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useContext, useState } from 'react';
import { EnvironmentFilled, EnvironmentOutlined } from '@ant-design/icons';
import { Col } from 'antd/lib/grid';

import { ObjectState } from 'cvat-core-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';

interface TrackerControls {
    trackerName: string;
    trackedClientIDs: ReadonlySet<number>;
    toggleTracking(objectState: ObjectState): Promise<void>;
}

const TrackerControlsContext = React.createContext<TrackerControls | null>(null);
export const TrackerControlsUpdateContext = React.createContext<
    React.Dispatch<React.SetStateAction<TrackerControls | null>>
>(() => {});

export function TrackerControlsProvider({ children }: { children: React.ReactNode }): JSX.Element {
    const [controls, setControls] = useState<TrackerControls | null>(null);
    return (
        <TrackerControlsUpdateContext.Provider value={setControls}>
            <TrackerControlsContext.Provider value={controls}>
                {children}
            </TrackerControlsContext.Provider>
        </TrackerControlsUpdateContext.Provider>
    );
}

export function TrackerButton({ objectState }: { objectState: ObjectState }): JSX.Element | null {
    const controls = useContext(TrackerControlsContext);
    if (!controls) return null;

    const isTracked = controls.trackedClientIDs.has(objectState.clientID as number);
    const title = isTracked ? 'Disable tracking' : `Enable tracking using ${controls.trackerName}`;
    const onClick = (): void => {
        controls.toggleTracking(objectState);
    };
    return (
        <Col>
            <CVATTooltip overlay={title}>
                {isTracked ? (
                    <EnvironmentFilled className='cvat-object-item-button-tracking' onClick={onClick} />
                ) : (
                    <EnvironmentOutlined className='cvat-object-item-button-tracking' onClick={onClick} />
                )}
            </CVATTooltip>
        </Col>
    );
}
