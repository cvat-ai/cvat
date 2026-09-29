// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useMemo, useState } from 'react';
import Dropdown from 'antd/lib/dropdown';
import { MoreOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';

import {
    audioActions,
    copyAudioIntervalAsync,
    removeAudioIntervalAsync,
    updateAudioIntervalAsync,
} from 'actions/audio-actions';
import { ColorBy } from 'reducers';
import ColorPicker from 'components/annotation-page/standard-workspace/objects-side-bar/color-picker';
import { ThunkDispatch } from 'utils/redux';
import AudioRegionItemMenu from './audio-region-item-menu';
import { copyAudioIntervalURL } from './utils/audio-interval';

interface Props {
    clientID: number;
    serverID: number | null;
    locked: boolean;
    color: string;
    colorBy: ColorBy;
}

export default function AudioIntervalMoreActions({
    clientID, serverID, locked, color, colorBy,
}: Props): JSX.Element {
    const dispatch = useDispatch<ThunkDispatch>();
    const [colorPickerVisible, setColorPickerVisible] = useState(false);

    const actionClassName = 'cvat-audio-region-item-action-btn';

    const handleCopyInterval = useCallback((): void => {
        dispatch(copyAudioIntervalAsync(clientID));
    }, [clientID, dispatch]);

    const handleDeleteInterval = useCallback((): void => {
        dispatch(removeAudioIntervalAsync(clientID));
    }, [clientID, dispatch]);

    const handleChangeColor = useCallback((newColor: string): void => {
        dispatch(updateAudioIntervalAsync(clientID, { color: newColor }));
    }, [clientID, dispatch]);

    const handleFitInterval = useCallback((): void => {
        dispatch(audioActions.fitAudioInterval(clientID));
    }, [clientID, dispatch]);

    const menu = useMemo(() => (
        AudioRegionItemMenu({
            serverID: serverID ?? undefined,
            locked,
            colorBy,
            onCreateURL: () => copyAudioIntervalURL(serverID),
            onCopy: handleCopyInterval,
            onChangeColorClick: () => setColorPickerVisible(true),
            onRemove: handleDeleteInterval,
            onFitInterval: handleFitInterval,
        })
    ), [
        colorBy,
        serverID,
        locked,
        handleCopyInterval,
        handleDeleteInterval,
        handleFitInterval,
    ]);

    const stopPropagation = (event: React.MouseEvent | React.KeyboardEvent): void => {
        event.stopPropagation();
    };

    const trigger = (
        <span
            role='button'
            tabIndex={0}
            className={actionClassName}
            onClick={stopPropagation}
            onKeyDown={stopPropagation}
        >
            <MoreOutlined />
        </span>
    );

    if (colorPickerVisible) {
        return (
            <ColorPicker
                visible
                value={color}
                onVisibleChange={setColorPickerVisible}
                onChange={handleChangeColor}
            >
                {trigger}
            </ColorPicker>
        );
    }

    return (
        <Dropdown destroyPopupOnHide placement='bottomRight' trigger={['click']} menu={menu}>
            {trigger}
        </Dropdown>
    );
}
