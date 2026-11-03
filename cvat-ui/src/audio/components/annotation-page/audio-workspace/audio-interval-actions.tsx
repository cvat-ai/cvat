// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon, {
    EyeInvisibleFilled, EyeOutlined, LockFilled,
    PushpinFilled, PushpinOutlined,
    UnlockOutlined,
} from '@ant-design/icons';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';

import {
    requestPlayAudioIntervalOnce,
    requestSetAudioPlaybackToIntervalBoundary,
    updateAudioIntervalAsync,
} from 'actions/audio-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import { ActiveControl, CombinedState } from 'reducers';
import { ThunkDispatch } from 'utils/redux';
import {
    PlayRangeIcon,
    SeekToEndIcon,
    SeekToStartIcon,
} from 'icons';

interface Props {
    clientID: number;
    locked: boolean;
    hidden: boolean;
    pinned: boolean;
    shortcuts: AudioIntervalActionShortcuts;
    more?: React.ReactNode;
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

interface AudioIntervalPlayButtonProps {
    clientID: number;
    hidden: boolean;
    shortcut: string;
}

function AudioIntervalPlayButton({
    clientID,
    hidden,
    shortcut,
}: AudioIntervalPlayButtonProps): JSX.Element {
    const dispatch = useDispatch<ThunkDispatch>();
    const canPlayInterval = useSelector((state: CombinedState) => (
        state.annotation.canvas.activeControl === ActiveControl.CURSOR
    ));
    const actionClassName = 'cvat-audio-region-item-action-btn';
    const playActionClassName = classNames(actionClassName, {
        'cvat-audio-region-item-action-btn-disabled': !canPlayInterval || hidden,
    });

    const handlePlayInterval = useCallback((): void => {
        if (!canPlayInterval || hidden) return;

        dispatch(requestPlayAudioIntervalOnce(clientID));
    }, [canPlayInterval, clientID, dispatch, hidden]);

    return (
        <AudioIntervalActionButton
            title={`Play interval as range ${shortcut}`}
            className={playActionClassName}
            onAction={handlePlayInterval}
        >
            <Icon component={PlayRangeIcon} aria-hidden />
        </AudioIntervalActionButton>
    );
}

export default function AudioIntervalActions({
    clientID,
    locked,
    hidden,
    pinned,
    shortcuts,
    more,
}: Props): JSX.Element {
    const dispatch = useDispatch<ThunkDispatch>();

    const actionClassName = 'cvat-audio-region-item-action-btn';
    const lockableActionClassName = classNames(actionClassName, {
        'cvat-audio-region-item-action-btn-disabled': locked,
    });

    const handleToggleLock = useCallback((): void => {
        dispatch(updateAudioIntervalAsync(clientID, (item) => ({ lock: !item.lock })));
    }, [clientID, dispatch]);

    const handleTogglePinned = useCallback((): void => {
        if (locked) return;

        dispatch(updateAudioIntervalAsync(clientID, (item) => ({ pinned: !item.pinned })));
    }, [clientID, dispatch, locked]);

    const handleToggleHidden = useCallback((): void => {
        if (locked) return;

        dispatch(updateAudioIntervalAsync(clientID, (item) => ({ hidden: !item.hidden })));
    }, [clientID, dispatch, locked]);

    const handleSetPlayback = useCallback((boundary: 'start' | 'end'): void => {
        dispatch(requestSetAudioPlaybackToIntervalBoundary(clientID, boundary));
    }, [clientID, dispatch]);
    const handleSetPlaybackToStart = useCallback((): void => {
        handleSetPlayback('start');
    }, [handleSetPlayback]);
    const handleSetPlaybackToEnd = useCallback((): void => {
        handleSetPlayback('end');
    }, [handleSetPlayback]);

    return (
        <div className='cvat-audio-interval-header-actions'>
            <Row gutter={24}>
                <Col>
                    <Row gutter={4}>
                        <Col>
                            <AudioIntervalActionButton
                                title={`Set playback to interval start ${shortcuts.setPlaybackToStart}`}
                                className={actionClassName}
                                onAction={handleSetPlaybackToStart}
                            >
                                <Icon component={SeekToStartIcon} aria-hidden />
                            </AudioIntervalActionButton>
                        </Col>
                        <Col>
                            <AudioIntervalPlayButton
                                clientID={clientID}
                                hidden={hidden}
                                shortcut={shortcuts.playInterval}
                            />
                        </Col>
                        <Col>
                            <AudioIntervalActionButton
                                title={`Set playback to interval end ${shortcuts.setPlaybackToEnd}`}
                                className={actionClassName}
                                onAction={handleSetPlaybackToEnd}
                            >
                                <Icon component={SeekToEndIcon} aria-hidden />
                            </AudioIntervalActionButton>
                        </Col>
                    </Row>
                </Col>
                <Col>
                    <Row gutter={4}>
                        <Col>
                            <AudioIntervalActionButton
                                title={`${locked ? 'Unlock interval' : 'Lock interval'} ${shortcuts.switchLock}`}
                                className={actionClassName}
                                onAction={handleToggleLock}
                            >
                                {locked ? <LockFilled /> : <UnlockOutlined />}
                            </AudioIntervalActionButton>
                        </Col>
                        <Col>
                            <AudioIntervalActionButton
                                title={`${pinned ? 'Unpin interval' : 'Pin interval'} ${shortcuts.switchPinned}`}
                                className={lockableActionClassName}
                                onAction={handleTogglePinned}
                            >
                                {pinned ? <PushpinFilled /> : <PushpinOutlined />}
                            </AudioIntervalActionButton>
                        </Col>
                        <Col>
                            <AudioIntervalActionButton
                                title={`${hidden ? 'Show interval' : 'Hide interval'} ${shortcuts.switchHidden}`}
                                className={lockableActionClassName}
                                onAction={handleToggleHidden}
                            >
                                {hidden ? <EyeInvisibleFilled /> : <EyeOutlined />}
                            </AudioIntervalActionButton>
                        </Col>
                    </Row>
                </Col>
                {more && <Col>{more}</Col>}
            </Row>
        </div>
    );
}
