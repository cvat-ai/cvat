// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useMemo, useState } from 'react';
import Dropdown from 'antd/lib/dropdown';
import { Row, Col } from 'antd/lib/grid';
import Icon, {
    EyeInvisibleFilled, EyeOutlined, LockFilled,
    MoreOutlined, PushpinFilled, PushpinOutlined,
    UnlockOutlined,
} from '@ant-design/icons';
import classNames from 'classnames';
import { useDispatch } from 'react-redux';

import { AudioIntervalState } from 'cvat-core-wrapper';
import {
    audioActions,
    copyAudioIntervalAsync,
    requestPlayAudioIntervalOnce,
    requestSetAudioPlaybackToIntervalBoundary,
    removeAudioIntervalAsync,
    updateAudioIntervalAsync,
} from 'actions/audio-actions';
import { ColorBy } from 'reducers';
import ColorPicker from 'components/annotation-page/standard-workspace/objects-side-bar/color-picker';
import CVATTooltip from 'components/common/cvat-tooltip';
import { ThunkDispatch } from 'utils/redux';
import {
    PlayRangeIcon,
    SeekToEndIcon,
    SeekToStartIcon,
} from 'icons';
import AudioRegionItemMenu from './audio-region-item-menu';
import { copyAudioIntervalURL, intervalID } from './utils/audio-interval';

interface Props {
    interval: AudioIntervalState;
    colorBy: ColorBy;
    canPlayInterval?: boolean;
    shortcuts: AudioIntervalActionShortcuts;
}

export interface AudioIntervalActionShortcuts {
    setPlaybackToStart: string;
    playInterval: string;
    setPlaybackToEnd: string;
    switchLock: string;
    switchPinned: string;
    switchHidden: string;
}

interface AudioIntervalActionButtonProps {
    title: string;
    className: string;
    onAction(): void;
    children: React.ReactNode;
}

function AudioIntervalActionButton({
    title,
    className,
    onAction,
    children,
}: AudioIntervalActionButtonProps): JSX.Element {
    const onClick = (event: React.MouseEvent): void => {
        event.stopPropagation();
        onAction();
    };
    const onKeyDown = (event: React.KeyboardEvent): void => {
        if (event.key === 'Enter') {
            event.stopPropagation();
            onAction();
        }
    };

    return (
        <CVATTooltip title={title}>
            <span
                role='button'
                tabIndex={0}
                className={className}
                onClick={onClick}
                onKeyDown={onKeyDown}
            >
                {children}
            </span>
        </CVATTooltip>
    );
}

export default function AudioIntervalActions({
    interval,
    colorBy,
    canPlayInterval = true,
    shortcuts,
}: Props): JSX.Element {
    const dispatch = useDispatch<ThunkDispatch>();
    const [colorPickerVisible, setColorPickerVisible] = useState(false);

    const id = intervalID(interval);
    const locked = !!interval.lock;
    const hidden = !!interval.hidden;
    const actionClassName = 'cvat-audio-region-item-action-btn';
    const lockableActionClassName = classNames(actionClassName, {
        'cvat-audio-region-item-action-btn-disabled': locked,
    });
    const playActionClassName = classNames(actionClassName, {
        'cvat-audio-region-item-action-btn-disabled': hidden,
    });

    const handlePlayInterval = useCallback((): void => {
        if (!canPlayInterval || hidden) return;

        dispatch(requestPlayAudioIntervalOnce(id));
    }, [canPlayInterval, dispatch, hidden, id]);

    const handleToggleLock = useCallback((): void => {
        dispatch(updateAudioIntervalAsync(id, (item) => ({ lock: !item.lock })));
    }, [dispatch, id]);

    const handleTogglePinned = useCallback((): void => {
        if (locked) return;

        dispatch(updateAudioIntervalAsync(id, (item) => ({ pinned: !item.pinned })));
    }, [dispatch, id, locked]);

    const handleToggleHidden = useCallback((): void => {
        if (locked) return;

        dispatch(updateAudioIntervalAsync(id, (item) => ({ hidden: !item.hidden })));
    }, [dispatch, id, locked]);

    const handleCopyInterval = useCallback((): void => {
        dispatch(copyAudioIntervalAsync(id));
    }, [dispatch, id]);

    const handleDeleteInterval = useCallback((): void => {
        dispatch(removeAudioIntervalAsync(id));
    }, [dispatch, id]);

    const handleChangeColor = useCallback((color: string): void => {
        dispatch(updateAudioIntervalAsync(id, { color }));
    }, [dispatch, id]);

    const handleSetPlayback = useCallback((boundary: 'start' | 'end'): void => {
        dispatch(requestSetAudioPlaybackToIntervalBoundary(id, boundary));
    }, [dispatch, id]);
    const handleSetPlaybackToStart = useCallback((): void => {
        handleSetPlayback('start');
    }, [handleSetPlayback]);
    const handleSetPlaybackToEnd = useCallback((): void => {
        handleSetPlayback('end');
    }, [handleSetPlayback]);

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

    return (
        <div className='cvat-audio-interval-header-actions'>
            <Row gutter={4}>
                <Col>
                    <Row>
                        <AudioIntervalActionButton
                            title={`Set playback to interval start ${shortcuts.setPlaybackToStart}`}
                            className={actionClassName}
                            onAction={handleSetPlaybackToStart}
                        >
                            <Icon component={SeekToStartIcon} aria-hidden />
                        </AudioIntervalActionButton>
                        <AudioIntervalActionButton
                            title={`Play interval as range ${shortcuts.playInterval}`}
                            className={playActionClassName}
                            onAction={handlePlayInterval}
                        >
                            <Icon component={PlayRangeIcon} aria-hidden />
                        </AudioIntervalActionButton>
                        <AudioIntervalActionButton
                            title={`Set playback to interval end ${shortcuts.setPlaybackToEnd}`}
                            className={actionClassName}
                            onAction={handleSetPlaybackToEnd}
                        >
                            <Icon component={SeekToEndIcon} aria-hidden />
                        </AudioIntervalActionButton>
                    </Row>
                </Col>
                <Col>
                    <Row>
                        <AudioIntervalActionButton
                            title={`${locked ? 'Unlock interval' : 'Lock interval'} ${shortcuts.switchLock}`}
                            className={actionClassName}
                            onAction={handleToggleLock}
                        >
                            {locked ? <LockFilled /> : <UnlockOutlined />}
                        </AudioIntervalActionButton>
                        <AudioIntervalActionButton
                            title={`${interval.pinned ? 'Unpin interval' : 'Pin interval'} ${shortcuts.switchPinned}`}
                            className={lockableActionClassName}
                            onAction={handleTogglePinned}
                        >
                            {interval.pinned ? <PushpinFilled /> : <PushpinOutlined />}
                        </AudioIntervalActionButton>
                        <AudioIntervalActionButton
                            title={`${interval.hidden ? 'Show interval' : 'Hide interval'} ${shortcuts.switchHidden}`}
                            className={lockableActionClassName}
                            onAction={handleToggleHidden}
                        >
                            {interval.hidden ? <EyeInvisibleFilled /> : <EyeOutlined />}
                        </AudioIntervalActionButton>
                    </Row>
                </Col>
                <Col>
                    {colorPickerVisible ? (
                        <ColorPicker
                            visible
                            value={interval.color ?? ''}
                            onVisibleChange={setColorPickerVisible}
                            onChange={handleChangeColor}
                        >
                            <span
                                role='button'
                                tabIndex={0}
                                className={actionClassName}
                                onClick={stopPropagation}
                                onKeyDown={stopPropagation}
                            >
                                <MoreOutlined />
                            </span>
                        </ColorPicker>
                    ) : (
                        <Dropdown destroyPopupOnHide placement='bottomRight' trigger={['click']} menu={menu}>
                            <span
                                role='button'
                                tabIndex={0}
                                className={actionClassName}
                                onClick={stopPropagation}
                                onKeyDown={stopPropagation}
                            >
                                <MoreOutlined />
                            </span>
                        </Dropdown>
                    )}
                </Col>
            </Row>
        </div>
    );
}
