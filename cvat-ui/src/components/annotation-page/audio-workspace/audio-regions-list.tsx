import React, { useCallback, useMemo, useState } from 'react';
import Empty from 'antd/lib/empty';
import Dropdown from 'antd/lib/dropdown';
import {
    LockFilled, UnlockOutlined,
    EyeInvisibleFilled, EyeOutlined,
    MoreOutlined,
} from '@ant-design/icons';
import { AudioRegion, ColorBy } from 'reducers';
import { Label } from 'cvat-core-wrapper';
import { toClipboard } from 'utils/to-clipboard';
import { formatTimeShort } from 'utils/format-audio-time';
import { hexToRgbComponents } from 'utils/hex-color';
import ColorPicker from 'components/annotation-page/standard-workspace/objects-side-bar/color-picker';
import { getRegionItemColor } from './audio-region-colors';
import AudioRegionItemMenu from './audio-region-item-menu';
import AudioRegionsListHeader, { AudioRegionsOrdering } from './audio-regions-list-header';
import { setPlayOnceRegionId } from './utils/play-once-region';

type RegionPatch =
    | Partial<AudioRegion>
    | ((region: AudioRegion, regions: AudioRegion[]) => Partial<AudioRegion>);

function sortRegions(regions: AudioRegion[], ordering: AudioRegionsOrdering, labels: Label[]): AudioRegion[] {
    const copy = [...regions];
    switch (ordering) {
        case AudioRegionsOrdering.START_TIME:
            return copy.sort((a, b) => a.start - b.start);
        case AudioRegionsOrdering.Z_ORDER:
            return copy.sort((a, b) => a.zOrder - b.zOrder);
        case AudioRegionsOrdering.LABEL_NAME: {
            const nameOf = (id: number | null): string => {
                if (id == null) return '';
                return labels.find((l) => l.id === id)?.name ?? '';
            };
            return copy.sort((a, b) => nameOf(a.labelId).localeCompare(nameOf(b.labelId)));
        }
        case AudioRegionsOrdering.INSERTION:
        default:
            return copy;
    }
}

interface ItemProps {
    region: AudioRegion;
    label: Label | undefined;
    displayIndex: number;
    isActive: boolean;
    itemColor: string;
    colorBy: ColorBy;
    onSetActiveRegion(regionId: string | null): void;
    onSetHoveredRegion(regionId: string | null): void;
    onSwitchPlay(playing: boolean): void;
    onSetCurrentTime(time: number): void;
    onToggleRegionLock(regionId: string): void;
    onToggleRegionHidden(regionId: string): void;
    onCopyRegion(regionId: string): void;
    onDeleteRegion(regionId: string): void;
    onUpdateRegion(regionId: string, patch: RegionPatch): void;
}

function AudioRegionItem(props: ItemProps): JSX.Element {
    const {
        region, label, displayIndex, isActive, itemColor, colorBy,
        onSetActiveRegion, onSetHoveredRegion, onSwitchPlay, onSetCurrentTime,
        onToggleRegionLock, onToggleRegionHidden,
        onCopyRegion, onDeleteRegion, onUpdateRegion,
    } = props;

    const isHidden = !!region.hidden;
    const isLocked = !!region.locked;
    const [colorPickerVisible, setColorPickerVisible] = useState(false);

    const handleMouseEnter = useCallback(() => onSetHoveredRegion(region.id), [onSetHoveredRegion, region.id]);
    const handleMouseLeave = useCallback(() => onSetHoveredRegion(null), [onSetHoveredRegion]);
    const handleClick = useCallback(() => onSetActiveRegion(region.id), [onSetActiveRegion, region.id]);
    const handleDoubleClick = useCallback(() => {
        setPlayOnceRegionId(region.id);
        onSetActiveRegion(region.id);
        onSetCurrentTime(Math.max(0, region.start));
        onSwitchPlay(true);
    }, [onSetActiveRegion, onSetCurrentTime, onSwitchPlay, region.id, region.start]);
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') onSetActiveRegion(region.id);
    }, [onSetActiveRegion, region.id]);
    const handleToggleLock = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        onToggleRegionLock(region.id);
    }, [onToggleRegionLock, region.id]);
    const handleToggleHidden = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        if (!isLocked) onToggleRegionHidden(region.id);
    }, [onToggleRegionHidden, region.id, isLocked]);

    const menu = useMemo(() => AudioRegionItemMenu({
        serverID: region.serverId,
        locked: isLocked,
        colorBy,
        onCreateURL: () => {
            if (region.serverId) {
                const { origin, pathname } = window.location;
                const url = `${origin}${pathname}?type=interval&serverID=${region.serverId}`;
                toClipboard(url);
            }
        },
        onCopy: () => onCopyRegion(region.id),
        onChangeColorClick: () => setColorPickerVisible(true),
        onRemove: () => onDeleteRegion(region.id),
    }), [
        region.id, region.serverId,
        isLocked, colorBy,
        onCopyRegion, onDeleteRegion,
    ]);

    return (
        <div
            role='button'
            tabIndex={0}
            className={
                'cvat-audio-region-item' +
                `${isActive ? ' cvat-audio-region-item--active' : ''}` +
                `${isHidden ? ' cvat-audio-region-item--hidden' : ''}`
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
                <div className={
                    'cvat-audio-region-item-label' +
                        `${!label ? ' cvat-audio-region-item-label--none' : ''}`
                }
                >
                    {label ? label.name : 'None'}
                </div>
                <div className='cvat-audio-region-item-time'>
                    <span>{formatTimeShort(region.start)}</span>
                    <span className='cvat-audio-region-item-separator'>&rarr;</span>
                    <span>{formatTimeShort(region.end)}</span>
                </div>
                <div className='cvat-audio-region-item-duration'>
                    {formatTimeShort(Math.max(0, region.end - region.start))}
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
                            `${isLocked ? ' cvat-audio-region-item-action-btn--disabled' : ''}`
                    }
                    onClick={handleToggleHidden}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleToggleHidden(e); }}
                >
                    {isHidden ? <EyeInvisibleFilled /> : <EyeOutlined />}
                </span>
                {colorPickerVisible ? (
                    <ColorPicker
                        visible
                        value={region.color ?? ''}
                        onVisibleChange={setColorPickerVisible}
                        onChange={(color: string) => onUpdateRegion(region.id, { color })}
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
    regions: AudioRegion[];
    activeRegionId: string | null;
    labels: Label[];
    colorBy: ColorBy;
    switchLockAllShortcut: string;
    switchHiddenAllShortcut: string;
    onSetActiveRegion(regionId: string | null): void;
    onSetHoveredRegion(regionId: string | null): void;
    onSwitchPlay(playing: boolean): void;
    onSetCurrentTime(time: number): void;
    onToggleRegionLock(regionId: string): void;
    onToggleRegionHidden(regionId: string): void;
    onSetRegions(regions: AudioRegion[]): void;
    onCopyRegion(regionId: string): void;
    onUpdateRegion(regionId: string, patch: RegionPatch): void;
}

export default function AudioRegionsList(props: Props): JSX.Element {
    const {
        regions,
        activeRegionId,
        labels,
        colorBy,
        switchLockAllShortcut,
        switchHiddenAllShortcut,
        onSetActiveRegion,
        onSetHoveredRegion,
        onSwitchPlay,
        onSetCurrentTime,
        onToggleRegionLock,
        onToggleRegionHidden,
        onSetRegions,
        onCopyRegion,
        onUpdateRegion,
    } = props;

    const [ordering, setOrdering] = useState<AudioRegionsOrdering>(AudioRegionsOrdering.INSERTION);

    const allLocked = regions.length > 0 && regions.every((r) => !!r.locked);
    const allHidden = regions.length > 0 && regions.every((r) => !!r.hidden);

    const onLockAll = useCallback(() => {
        onSetRegions(regions.map((r) => ({ ...r, locked: true })));
    }, [regions, onSetRegions]);
    const onUnlockAll = useCallback(() => {
        onSetRegions(regions.map((r) => ({ ...r, locked: false })));
    }, [regions, onSetRegions]);
    const onHideAll = useCallback(() => {
        onSetRegions(regions.map((r) => ({ ...r, hidden: true })));
    }, [regions, onSetRegions]);
    const onShowAll = useCallback(() => {
        onSetRegions(regions.map((r) => ({ ...r, hidden: false })));
    }, [regions, onSetRegions]);

    const onDeleteRegion = useCallback((regionId: string) => {
        onSetRegions(regions.filter((r) => r.id !== regionId));
        if (regionId === activeRegionId) {
            onSetActiveRegion(null);
        }
    }, [regions, activeRegionId, onSetRegions, onSetActiveRegion]);

    const sortedRegions = useMemo(() => sortRegions(regions, ordering, labels),
        [regions, ordering, labels]);

    const indexById = useMemo(() => {
        const map = new Map<string, number>();
        regions.forEach((r, i) => map.set(r.id, i));
        return map;
    }, [regions]);

    const header = (
        <AudioRegionsListHeader
            count={regions.length}
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

    if (!regions.length) {
        return (
            <div className='cvat-audio-regions-list-wrapper'>
                {header}
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description='No intervals created'
                    className='cvat-audio-regions-list-empty'
                />
            </div>
        );
    }

    return (
        <div className='cvat-audio-regions-list-wrapper'>
            {header}
            <div className='cvat-audio-regions-list'>
                {sortedRegions.map((region) => (
                    <MemoAudioRegionItem
                        key={region.id}
                        region={region}
                        label={labels.find((l) => l.id === region.labelId)}
                        displayIndex={indexById.get(region.id) ?? 0}
                        isActive={region.id === activeRegionId}
                        itemColor={getRegionItemColor(region, labels, colorBy)}
                        colorBy={colorBy}
                        onSetActiveRegion={onSetActiveRegion}
                        onSetHoveredRegion={onSetHoveredRegion}
                        onSwitchPlay={onSwitchPlay}
                        onSetCurrentTime={onSetCurrentTime}
                        onToggleRegionLock={onToggleRegionLock}
                        onToggleRegionHidden={onToggleRegionHidden}
                        onCopyRegion={onCopyRegion}
                        onDeleteRegion={onDeleteRegion}
                        onUpdateRegion={onUpdateRegion}
                    />
                ))}
            </div>
        </div>
    );
}
