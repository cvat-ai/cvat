// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import Empty from 'antd/lib/empty';
import classNames from 'classnames';
import { ActiveControl, ColorBy } from 'reducers';
import { AudioIntervalState, Label } from 'cvat-core-wrapper';
import { hexToRgbComponents } from 'audio/utils/hex-color';
import { getRegionItemColor } from './audio-region-colors';
import { AudioIntervalActionShortcuts } from './audio-interval-actions';
import AudioIntervalHeader from './audio-interval-header';
import AudioRegionsListHeader, { AudioRegionsOrdering } from './audio-regions-list-header';
import { intervalID } from './utils/audio-interval';

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
    labels: Label[];
    displayIndex: number;
    isActive: boolean;
    isHovered: boolean;
    itemColor: string;
    colorBy: ColorBy;
    activeControl: ActiveControl;
    intervalActionShortcuts: AudioIntervalActionShortcuts;
    onSetActiveInterval(clientID: number | null): void;
    onSetHoveredInterval(clientID: number | null): void;
    onPlayIntervalOnce(clientID: number): void;
    onChangeLabel(clientID: number, labelID: number): void;
}

function AudioRegionItem(props: ItemProps): JSX.Element {
    const {
        interval, labels, displayIndex, isActive, isHovered, itemColor, colorBy,
        activeControl, intervalActionShortcuts,
        onSetActiveInterval, onSetHoveredInterval, onPlayIntervalOnce,
        onChangeLabel,
    } = props;

    const id = intervalID(interval);
    const isHidden = !!interval.hidden;
    const isLocked = !!interval.lock;
    const isCursor = activeControl === ActiveControl.CURSOR;

    const handleMouseEnter = useCallback(() => onSetHoveredInterval(id), [onSetHoveredInterval, id]);
    const handleMouseLeave = useCallback(() => onSetHoveredInterval(null), [onSetHoveredInterval]);
    const handleClick = useCallback(() => {
        if (!isCursor) return;
        onSetActiveInterval(id);
    }, [isCursor, onSetActiveInterval, id]);
    const handleDoubleClick = useCallback(() => {
        if (!isCursor) return;
        onPlayIntervalOnce(id);
    }, [isCursor, onPlayIntervalOnce, id]);
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (isCursor && (e.key === 'Enter' || e.key === ' ')) onSetActiveInterval(id);
    }, [isCursor, onSetActiveInterval, id]);
    return (
        <div
            role='button'
            tabIndex={0}
            data-interval-id={id}
            className={classNames('cvat-audio-region-item', {
                'cvat-audio-region-item-active': isActive,
                'cvat-audio-region-item-hovered': isHovered,
                'cvat-audio-region-item-hidden': isHidden,
            })}
            style={{ '--region-item-color': hexToRgbComponents(itemColor) } as React.CSSProperties}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onKeyDown={handleKeyDown}
        >
            <AudioIntervalHeader
                interval={interval}
                intervalIndex={displayIndex}
                labels={labels}
                isReadonly={isLocked}
                showSource
                colorBy={colorBy}
                shortcuts={intervalActionShortcuts}
                isCompact
                canPlayInterval={isCursor}
                onChangeLabel={(labelID) => onChangeLabel(id, labelID)}
            />
        </div>
    );
}

const MemoAudioRegionItem = React.memo(AudioRegionItem);

interface Props {
    intervals: AudioIntervalState[];
    filtersActive: boolean;
    activeIntervalID: number | null;
    hoveredIntervalID: number | null;
    labels: Label[];
    colorBy: ColorBy;
    activeControl: ActiveControl;
    intervalActionShortcuts: AudioIntervalActionShortcuts;
    switchLockAllShortcut: string;
    switchPinAllShortcut: string;
    switchHiddenAllShortcut: string;
    onSetActiveInterval(clientID: number | null): void;
    onSetHoveredInterval(clientID: number | null): void;
    onPlayIntervalOnce(clientID: number): void;
    onToggleIntervalsLock(clientIDs: number[], lock: boolean): void;
    onToggleIntervalsPinned(clientIDs: number[], pinned: boolean): void;
    onToggleIntervalsHidden(clientIDs: number[], hidden: boolean): void;
    onChangeLabel(clientID: number, labelID: number): void;
}

export default function AudioRegionsList(props: Props): JSX.Element {
    const {
        intervals,
        filtersActive,
        activeIntervalID,
        hoveredIntervalID,
        labels,
        colorBy,
        activeControl,
        intervalActionShortcuts,
        switchLockAllShortcut,
        switchPinAllShortcut,
        switchHiddenAllShortcut,
        onSetActiveInterval,
        onSetHoveredInterval,
        onPlayIntervalOnce,
        onToggleIntervalsLock,
        onToggleIntervalsPinned,
        onToggleIntervalsHidden,
        onChangeLabel,
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
    const pinnableIntervals = useMemo(() => intervals.filter((interval) => !interval.lock), [intervals]);
    const allPinned = pinnableIntervals.length > 0 && pinnableIntervals.every((interval) => !!interval.pinned);
    const allHidden = intervals.length > 0 && intervals.every((interval) => !!interval.hidden);
    const visibleIds = useMemo(() => intervals.map((interval) => intervalID(interval)), [intervals]);
    const pinnableIds = useMemo(() => pinnableIntervals.map((interval) => intervalID(interval)), [pinnableIntervals]);

    const onLockAll = useCallback(() => {
        onToggleIntervalsLock(visibleIds, true);
    }, [visibleIds, onToggleIntervalsLock]);
    const onUnlockAll = useCallback(() => {
        onToggleIntervalsLock(visibleIds, false);
    }, [visibleIds, onToggleIntervalsLock]);
    const onPinAll = useCallback(() => {
        onToggleIntervalsPinned(pinnableIds, true);
    }, [pinnableIds, onToggleIntervalsPinned]);
    const onUnpinAll = useCallback(() => {
        onToggleIntervalsPinned(pinnableIds, false);
    }, [pinnableIds, onToggleIntervalsPinned]);
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
            allPinned={allPinned}
            allHidden={allHidden}
            switchLockAllShortcut={switchLockAllShortcut}
            switchPinAllShortcut={switchPinAllShortcut}
            switchHiddenAllShortcut={switchHiddenAllShortcut}
            onChangeOrdering={setOrdering}
            onLockAll={onLockAll}
            onUnlockAll={onUnlockAll}
            onPinAll={onPinAll}
            onUnpinAll={onUnpinAll}
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
                            labels={labels}
                            displayIndex={indexById.get(id) ?? 0}
                            isActive={id === activeIntervalID}
                            isHovered={id === hoveredIntervalID}
                            itemColor={getRegionItemColor(interval, labels, colorBy)}
                            colorBy={colorBy}
                            activeControl={activeControl}
                            intervalActionShortcuts={intervalActionShortcuts}
                            onSetActiveInterval={onSetActiveInterval}
                            onSetHoveredInterval={onSetHoveredInterval}
                            onPlayIntervalOnce={onPlayIntervalOnce}
                            onChangeLabel={onChangeLabel}
                        />
                    );
                })}
            </div>
        </div>
    );
}
