// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import Empty from 'antd/lib/empty';
import Dropdown from 'antd/lib/dropdown';
import {
    LockFilled, UnlockOutlined,
    EyeInvisibleFilled, EyeOutlined,
    MoreOutlined,
} from '@ant-design/icons';
import { ActiveControl, ColorBy } from 'reducers';
import { AudioIntervalState, Label } from 'cvat-core-wrapper';
import { toClipboard } from 'utils/to-clipboard';
import { formatTimeShort } from 'audio/utils/format-audio-time';
import { hexToRgbComponents } from 'audio/utils/hex-color';
import ColorPicker from 'components/annotation-page/standard-workspace/objects-side-bar/color-picker';
import { getRegionItemColor } from './audio-region-colors';
import AudioRegionItemMenu from './audio-region-item-menu';
import AudioRegionsListHeader, { AudioRegionsOrdering } from './audio-regions-list-header';
import { setPlayOnceRegionId } from './utils/play-once-region';
import {
    intervalDurationSeconds,
    intervalEndSeconds,
    intervalID,
    intervalStartSeconds,
} from './utils/audio-interval';

function sortIntervals(
    intervals: AudioIntervalState[],
    ordering: AudioRegionsOrdering,
): AudioIntervalState[] {
    const copy = [...intervals];
    switch (ordering) {
        case AudioRegionsOrdering.START_TIME:
            return copy.sort((a, b) => a.start - b.start);
        case AudioRegionsOrdering.LABEL_NAME:
            return copy.sort((a, b) => a.label.name.localeCompare(b.label.name));
        case AudioRegionsOrdering.INSERTION:
        default:
            return copy;
    }
}

interface ItemProps {
    interval: AudioIntervalState;
    displayIndex: number;
    isActive: boolean;
    itemColor: string;
    colorBy: ColorBy;
    activeControl: ActiveControl;
    onSetActiveInterval(clientID: number | null): void;
    onSetHoveredInterval(clientID: number | null): void;
    onSwitchPlay(playing: boolean): void;
    onSetCurrentTime(time: number): void;
    onToggleIntervalLock(clientID: number): void;
    onToggleIntervalHidden(clientID: number): void;
    onCopyInterval(clientID: number): void;
    onDeleteInterval(clientID: number): void;
    onChangeIntervalColor(clientID: number, color: string): void;
}

function AudioRegionItem(props: ItemProps): JSX.Element {
    const {
        interval, displayIndex, isActive, itemColor, colorBy,
        activeControl,
        onSetActiveInterval, onSetHoveredInterval, onSwitchPlay, onSetCurrentTime,
        onToggleIntervalLock, onToggleIntervalHidden,
        onCopyInterval, onDeleteInterval, onChangeIntervalColor,
    } = props;

    const id = intervalID(interval);
    const isHidden = !!interval.hidden;
    const isLocked = !!interval.lock;
    const isCursor = activeControl === ActiveControl.CURSOR;
    const [colorPickerVisible, setColorPickerVisible] = useState(false);

    const handleMouseEnter = useCallback(() => onSetHoveredInterval(id), [onSetHoveredInterval, id]);
    const handleMouseLeave = useCallback(() => onSetHoveredInterval(null), [onSetHoveredInterval]);
    const handleClick = useCallback(() => {
        if (isCursor) onSetActiveInterval(id);
    }, [isCursor, onSetActiveInterval, id]);
    const handleDoubleClick = useCallback(() => {
        if (!isCursor) return;
        setPlayOnceRegionId(String(id));
        onSetActiveInterval(id);
        onSetCurrentTime(Math.max(0, intervalStartSeconds(interval)));
        onSwitchPlay(true);
    }, [isCursor, onSetActiveInterval, onSetCurrentTime, onSwitchPlay, id, interval]);
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (isCursor && (e.key === 'Enter' || e.key === ' ')) onSetActiveInterval(id);
    }, [isCursor, onSetActiveInterval, id]);
    const handleToggleLock = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        onToggleIntervalLock(id);
    }, [onToggleIntervalLock, id]);
    const handleToggleHidden = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        if (!isLocked) onToggleIntervalHidden(id);
    }, [onToggleIntervalHidden, id, isLocked]);

    const menu = useMemo(() => AudioRegionItemMenu({
        serverID: interval.serverID ?? undefined,
        locked: isLocked,
        colorBy,
        onCreateURL: () => {
            if (interval.serverID) {
                const { origin, pathname } = window.location;
                const url = `${origin}${pathname}?type=interval&serverID=${interval.serverID}`;
                toClipboard(url);
            }
        },
        onCopy: () => onCopyInterval(id),
        onChangeColorClick: () => setColorPickerVisible(true),
        onRemove: () => onDeleteInterval(id),
    }), [
        id, interval.serverID,
        isLocked, colorBy,
        onCopyInterval, onDeleteInterval,
    ]);

    return (
        <div
            role='button'
            tabIndex={0}
            data-interval-id={id}
            className={
                'cvat-audio-region-item' +
                `${isActive ? ' cvat-audio-region-item-active' : ''}` +
                `${isHidden ? ' cvat-audio-region-item-hidden' : ''}`
            }
            style={{ '--region-item-color': hexToRgbComponents(itemColor) } as React.CSSProperties}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onKeyDown={handleKeyDown}
        >
            <div className='cvat-audio-region-item-index'>{displayIndex + 1}</div>
            <div className='cvat-audio-region-item-info'>
                <div className='cvat-audio-region-item-label'>
                    {interval.label.name}
                </div>
                <div className='cvat-audio-region-item-time'>
                    <span>{formatTimeShort(intervalStartSeconds(interval))}</span>
                    <span className='cvat-audio-region-item-separator'>&rarr;</span>
                    <span>{formatTimeShort(intervalEndSeconds(interval))}</span>
                </div>
                <div className='cvat-audio-region-item-duration'>
                    {formatTimeShort(intervalDurationSeconds(interval))}
                </div>
            </div>
            <div className='cvat-audio-region-item-actions'>
                <span
                    role='button'
                    tabIndex={0}
                    className='cvat-audio-region-item-action-btn'
                    onClick={handleToggleLock}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleToggleLock(e); }}
                >
                    {isLocked ? <LockFilled /> : <UnlockOutlined />}
                </span>
                <span
                    role='button'
                    tabIndex={0}
                    className={
                        'cvat-audio-region-item-action-btn' +
                            `${isLocked ? ' cvat-audio-region-item-action-btn-disabled' : ''}`
                    }
                    onClick={handleToggleHidden}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleToggleHidden(e); }}
                >
                    {isHidden ? <EyeInvisibleFilled /> : <EyeOutlined />}
                </span>
                {colorPickerVisible ? (
                    <ColorPicker
                        visible
                        value={interval.color ?? ''}
                        onVisibleChange={setColorPickerVisible}
                        onChange={(color: string) => onChangeIntervalColor(id, color)}
                    >
                        <span
                            role='button'
                            tabIndex={0}
                            className='cvat-audio-region-item-action-btn'
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                        >
                            <MoreOutlined />
                        </span>
                    </ColorPicker>
                ) : (
                    <Dropdown
                        destroyPopupOnHide
                        placement='bottomRight'
                        trigger={['click']}
                        menu={menu}
                    >
                        <span
                            role='button'
                            tabIndex={0}
                            className='cvat-audio-region-item-action-btn'
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                        >
                            <MoreOutlined />
                        </span>
                    </Dropdown>
                )}
            </div>
        </div>
    );
}

const MemoAudioRegionItem = React.memo(AudioRegionItem);

interface Props {
    intervals: AudioIntervalState[];
    filtersActive: boolean;
    activeIntervalID: number | null;
    labels: Label[];
    colorBy: ColorBy;
    activeControl: ActiveControl;
    switchLockAllShortcut: string;
    switchHiddenAllShortcut: string;
    onSetActiveInterval(clientID: number | null): void;
    onSetHoveredInterval(clientID: number | null): void;
    onSwitchPlay(playing: boolean): void;
    onSetCurrentTime(time: number): void;
    onToggleIntervalLock(clientID: number): void;
    onToggleIntervalHidden(clientID: number): void;
    onToggleIntervalsLock(clientIDs: number[], lock: boolean): void;
    onToggleIntervalsHidden(clientIDs: number[], hidden: boolean): void;
    onCopyInterval(clientID: number): void;
    onDeleteInterval(clientID: number, force?: boolean): void;
    onChangeIntervalColor(clientID: number, color: string): void;
}

export default function AudioRegionsList(props: Props): JSX.Element {
    const {
        intervals,
        filtersActive,
        activeIntervalID,
        labels,
        colorBy,
        activeControl,
        switchLockAllShortcut,
        switchHiddenAllShortcut,
        onSetActiveInterval,
        onSetHoveredInterval,
        onSwitchPlay,
        onSetCurrentTime,
        onToggleIntervalLock,
        onToggleIntervalHidden,
        onToggleIntervalsLock,
        onToggleIntervalsHidden,
        onCopyInterval,
        onDeleteInterval,
        onChangeIntervalColor,
    } = props;

    const [ordering, setOrdering] = useState<AudioRegionsOrdering>(AudioRegionsOrdering.INSERTION);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeIntervalID === null) return;
        const container = listRef.current;
        if (!container) return;
        const item = container.querySelector(`[data-interval-id="${CSS.escape(String(activeIntervalID))}"]`);
        if (item) {
            (item as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [activeIntervalID]);

    const allLocked = intervals.length > 0 && intervals.every((interval) => !!interval.lock);
    const allHidden = intervals.length > 0 && intervals.every((interval) => !!interval.hidden);
    const visibleIds = useMemo(() => intervals.map((interval) => intervalID(interval)), [intervals]);

    const onLockAll = useCallback(() => {
        onToggleIntervalsLock(visibleIds, true);
    }, [visibleIds, onToggleIntervalsLock]);
    const onUnlockAll = useCallback(() => {
        onToggleIntervalsLock(visibleIds, false);
    }, [visibleIds, onToggleIntervalsLock]);
    const onHideAll = useCallback(() => {
        onToggleIntervalsHidden(visibleIds, true);
    }, [visibleIds, onToggleIntervalsHidden]);
    const onShowAll = useCallback(() => {
        onToggleIntervalsHidden(visibleIds, false);
    }, [visibleIds, onToggleIntervalsHidden]);

    const sortedIntervals = useMemo(() => sortIntervals(intervals, ordering),
        [intervals, ordering, labels]);

    const indexById = useMemo(() => {
        const map = new Map<number, number>();
        intervals.forEach((interval, i) => map.set(intervalID(interval), i));
        return map;
    }, [intervals]);

    const header = (
        <AudioRegionsListHeader
            count={intervals.length}
            ordering={ordering}
            allLocked={allLocked}
            allHidden={allHidden}
            switchLockAllShortcut={switchLockAllShortcut}
            switchHiddenAllShortcut={switchHiddenAllShortcut}
            onChangeOrdering={setOrdering}
            onLockAll={onLockAll}
            onUnlockAll={onUnlockAll}
            onHideAll={onHideAll}
            onShowAll={onShowAll}
        />
    );

    if (!intervals.length) {
        const description = filtersActive ? 'No intervals match filters' : 'No intervals created';
        return (
            <div className='cvat-audio-regions-list-wrapper'>
                {header}
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={description}
                    className='cvat-audio-regions-list-empty'
                />
            </div>
        );
    }

    return (
        <div className='cvat-audio-regions-list-wrapper'>
            {header}
            <div className='cvat-audio-regions-list' ref={listRef}>
                {sortedIntervals.map((interval) => {
                    const id = intervalID(interval);
                    return (
                        <MemoAudioRegionItem
                            key={id}
                            interval={interval}
                            displayIndex={indexById.get(id) ?? 0}
                            isActive={id === activeIntervalID}
                            itemColor={getRegionItemColor(interval, labels, colorBy)}
                            colorBy={colorBy}
                            activeControl={activeControl}
                            onSetActiveInterval={onSetActiveInterval}
                            onSetHoveredInterval={onSetHoveredInterval}
                            onSwitchPlay={onSwitchPlay}
                            onSetCurrentTime={onSetCurrentTime}
                            onToggleIntervalLock={onToggleIntervalLock}
                            onToggleIntervalHidden={onToggleIntervalHidden}
                            onCopyInterval={onCopyInterval}
                            onDeleteInterval={onDeleteInterval}
                            onChangeIntervalColor={onChangeIntervalColor}
                        />
                    );
                })}
            </div>
        </div>
    );
}
