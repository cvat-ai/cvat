// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useMemo, useState } from 'react';
import Dropdown from 'antd/lib/dropdown';
import { MoreOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';

import { AudioIntervalState } from 'cvat-core-wrapper';
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
import { copyAudioIntervalURL, intervalID } from './utils/audio-interval';

interface Props {
    interval: AudioIntervalState;
    colorBy: ColorBy;
}

export default function AudioIntervalMoreActions({ interval, colorBy }: Props): JSX.Element {
    const dispatch = useDispatch<ThunkDispatch>();
    const [colorPickerVisible, setColorPickerVisible] = useState(false);

    const id = intervalID(interval);
    const locked = !!interval.lock;
    const actionClassName = 'cvat-audio-region-item-action-btn';

    const handleCopyInterval = useCallback((): void => {
        dispatch(copyAudioIntervalAsync(id));
    }, [dispatch, id]);

    const handleDeleteInterval = useCallback((): void => {
        dispatch(removeAudioIntervalAsync(id));
    }, [dispatch, id]);

    const handleChangeColor = useCallback((color: string): void => {
        dispatch(updateAudioIntervalAsync(id, { color }));
    }, [dispatch, id]);

    const handleFitInterval = useCallback((): void => {
        dispatch(audioActions.fitAudioInterval(id));
    }, [dispatch, id]);

    const menu = useMemo(() => (
        AudioRegionItemMenu({
            serverID: interval.serverID ?? undefined,
            locked,
            colorBy,
            onCreateURL: () => copyAudioIntervalURL(interval.serverID),
            onCopy: handleCopyInterval,
            onChangeColorClick: () => setColorPickerVisible(true),
            onRemove: handleDeleteInterval,
            onFitInterval: handleFitInterval,
        })
    ), [
        colorBy,
        interval.serverID,
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
                value={interval.color ?? ''}
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
