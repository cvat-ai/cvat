// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useRef, useState } from 'react';
import {
    DeleteOutlined, EyeInvisibleOutlined, EyeOutlined, MoreOutlined, PlayCircleOutlined, PauseCircleOutlined,
} from '@ant-design/icons';
import Button from 'antd/lib/button';
import Dropdown from 'antd/lib/dropdown';
import Slider from 'antd/lib/slider';

import CVATTooltip from 'components/common/cvat-tooltip';
import { Label } from 'cvat-core-wrapper';
import { ACTION_KEYS } from './phase-shortcuts';
import {
    draftEnd, DraftRange, PhaseClip, Range,
} from './phase-clips';

export type Edge = 'start' | 'end';
export type Hover = { id: number; edge: Edge };

interface Props {
    labels: Label[];
    phases: PhaseClip[];
    drafts: ReadonlyMap<number, DraftRange>;
    startFrame: number;
    stopFrame: number;
    frame: number;
    playing: boolean;
    activeTrack: number | null;
    selectedID: number | null;
    slots: ReadonlyMap<number, number>;
    bindings: ReadonlyMap<number, string>;
    playbackShortcut: string;
    onEditShortcut(label: Label): void;
    onDeleteTrack(label: Label): void;
    hidden: ReadonlySet<number>;
    onActivate(id: number | null): void;
    onPlay(): void;
    onVisibility(id: number): void;
    onRecord(label: Label, position?: number): void;
    onDraftEnd(id: number, position: number): void;
    onSelect(phase: PhaseClip): void;
    onChange(phase: PhaseClip, range: Range, seekTo: number): void;
    onHover(hover: Hover | null): void;
    onSeek(frame: number): void;
}

interface Drag {
    phase: PhaseClip;
    mode: Edge | 'move';
    pointer: number;
    origin: number;
    width: number;
    range: Range;
    moved: boolean;
}

export default function PhaseTimeline(props: Props): JSX.Element {
    const {
        labels, phases, drafts, startFrame, stopFrame, frame, playing, activeTrack, selectedID, slots, bindings, hidden,
        playbackShortcut, onEditShortcut, onDeleteTrack,
        onActivate, onPlay, onVisibility, onRecord, onDraftEnd, onSelect, onChange, onHover, onSeek,
    } = props;
    const tracks = useRef<HTMLDivElement>(null);
    const drag = useRef<Drag | null>(null);
    const suppressClick = useRef(false);
    const [preview, setPreview] = useState<{ id: number; range: Range } | null>(null);
    const [edgeHover, setEdgeHover] = useState<Hover | null>(null);
    const end = stopFrame + 1;
    const total = end - startFrame;
    const percent = (position: number): number => ((position - startFrame) / total) * 100;

    useEffect(() => {
        if (activeTrack === null) return;
        tracks.current?.querySelector(`[data-track-id="${activeTrack}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [activeTrack]);

    function aimAt(hover: Hover | null): void {
        setEdgeHover((previous) => (previous?.id === hover?.id && previous?.edge === hover?.edge ? previous : hover));
        onHover(hover);
    }

    function pointAtEdge(event: React.PointerEvent<HTMLDivElement>, id: number): void {
        const rect = event.currentTarget.getBoundingClientRect();
        aimAt({ id, edge: event.clientX < rect.left + rect.width / 2 ? 'start' : 'end' });
    }

    function positionAt(element: Element, x: number): number {
        const rect = element.getBoundingClientRect();
        const offset = Math.floor(((x - rect.left) / rect.width) * total);
        return Math.min(stopFrame, Math.max(startFrame, startFrame + offset));
    }

    function style(range: Range): React.CSSProperties {
        return { left: `${percent(range.start)}%`, width: `${percent(range.stop) - percent(range.start)}%` };
    }

    function begin(event: React.PointerEvent, phase: PhaseClip, mode: Drag['mode']): void {
        if (event.button !== 0 || phase.locked || drag.current) return;
        const track = event.currentTarget.closest('.cvat-action-phase-timeline');
        const width = track?.getBoundingClientRect().width ?? 0;
        if (!width) return;
        drag.current = {
            phase,
            mode,
            pointer: event.pointerId,
            origin: event.clientX,
            width,
            range: { start: phase.start, stop: phase.stop },
            moved: false,
        };
        suppressClick.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function move(event: React.PointerEvent): void {
        const active = drag.current;
        if (!active || event.pointerId !== active.pointer) return;
        const pixels = event.clientX - active.origin;
        if (!active.moved && Math.abs(pixels) < 3) return;
        active.moved = true;
        const delta = Math.round((pixels / active.width) * total);
        const { start, stop } = active.phase;
        if (active.mode === 'start') {
            active.range = { start: Math.min(stop - 1, Math.max(startFrame, start + delta)), stop };
        } else if (active.mode === 'end') {
            active.range = { start, stop: Math.max(start + 1, Math.min(end, stop + delta)) };
        } else {
            const shifted = Math.min(end - (stop - start), Math.max(startFrame, start + delta));
            active.range = { start: shifted, stop: shifted + stop - start };
        }
        setPreview({ id: active.phase.id, range: active.range });
    }

    function finish(event: React.PointerEvent): void {
        const active = drag.current;
        if (!active || event.pointerId !== active.pointer) return;
        drag.current = null;
        setPreview(null);
        if (event.type === 'pointercancel' || !active.moved) return;
        suppressClick.current = true;
        const { start, stop } = active.range;
        if (start !== active.phase.start || stop !== active.phase.stop) {
            onChange(active.phase, active.range, active.mode === 'end' ? stop - 1 : start);
        }
    }

    function pointerHandlers(phase: PhaseClip, mode: Drag['mode']): React.HTMLAttributes<HTMLElement> {
        return {
            onPointerDown: (event) => begin(event, phase, mode),
            onPointerMove: move,
            onPointerUp: finish,
            onPointerCancel: finish,
        };
    }

    return (
        <div className='cvat-action-phase-tracks' aria-label='Action tracks' ref={tracks}>
            <div
                className='cvat-action-phase-track cvat-action-phase-playback'
                data-active={activeTrack === null}
            >
                <CVATTooltip title={`Playback track ${playbackShortcut} · Switch tracks [Tab / Shift+Tab]`}>
                    <Button
                        type='text'
                        size='small'
                        autoFocus
                        aria-label='Playback'
                        aria-pressed={activeTrack === null}
                        className='cvat-action-phase-track-label'
                        icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                        onClick={() => onActivate(null)}
                        onDoubleClick={onPlay}
                    >
                        Playback
                    </Button>
                </CVATTooltip>
                <Slider
                    className='cvat-action-phase-seek'
                    min={startFrame}
                    max={Math.max(startFrame + 1, stopFrame)}
                    disabled={startFrame === stopFrame}
                    value={frame}
                    tooltip={{ formatter: (value) => `Frame ${value}` }}
                    onChange={(position) => {
                        onActivate(null);
                        onSeek(position);
                    }}
                />
            </div>
            {labels.map((label) => {
                const id = label.id as number;
                const draft = drafts.get(id);
                const slot = slots.get(id);
                const binding = bindings.get(id);
                const draftStop = draft ? Math.max(draft.start, draftEnd(draft, frame)) + 1 : 0;
                const trackPhases = phases.filter((phase) => phase.label.id === id);
                return (
                    <div
                        className='cvat-action-phase-track'
                        key={id}
                        data-track-id={id}
                        data-hidden={hidden.has(id)}
                        data-active={activeTrack === id}
                        data-recording={!!draft}
                    >
                        <div className='cvat-action-phase-track-heading'>
                            <CVATTooltip title={label.name}>
                                <Button
                                    type='text'
                                    size='small'
                                    className='cvat-action-phase-track-label'
                                    aria-pressed={activeTrack === id}
                                    aria-label={`${label.name} action track`}
                                    onClick={() => onActivate(id)}
                                    onDoubleClick={() => onRecord(label)}
                                >
                                    <span className='cvat-action-phase-track-color' style={{ backgroundColor: label.color }} />
                                    {slot !== undefined && binding !== ACTION_KEYS[slot] && (
                                        <span className='cvat-action-phase-track-number'>{slot + 1}</span>
                                    )}
                                    <span className='cvat-action-phase-track-name'>{label.name}</span>
                                    {draft && <span className='cvat-action-phase-recording-dot' aria-label='Recording' />}
                                </Button>
                            </CVATTooltip>
                            {slot !== undefined && (
                                <CVATTooltip title={binding ? `Record track with ${binding}. Click to change the key.` : 'Assign a recording shortcut'}>
                                    <Button
                                        type='text'
                                        size='small'
                                        aria-label={`Change ${label.name} shortcut`}
                                        className='cvat-action-phase-track-shortcut'
                                        onClick={() => onEditShortcut(label)}
                                    >
                                        {binding || '—'}
                                    </Button>
                                </CVATTooltip>
                            )}
                            <CVATTooltip title={hidden.has(id) ? 'Show track' : 'Hide track'}>
                                <Button
                                    type='text'
                                    size='small'
                                    icon={hidden.has(id) ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                                    aria-label={`${hidden.has(id) ? 'Show' : 'Hide'} ${label.name} track`}
                                    onClick={() => onVisibility(id)}
                                />
                            </CVATTooltip>
                            <Dropdown
                                trigger={['click']}
                                menu={{
                                    items: [{
                                        key: 'delete',
                                        icon: <DeleteOutlined />,
                                        label: 'Delete track',
                                        danger: true,
                                    }],
                                    onClick: () => onDeleteTrack(label),
                                }}
                            >
                                <Button
                                    type='text'
                                    size='small'
                                    icon={<MoreOutlined />}
                                    aria-label={`Options for ${label.name}`}
                                />
                            </Dropdown>
                        </div>
                        <div className='cvat-action-phase-timeline' aria-label={`${label.name} track`}>
                            <button
                                type='button'
                                className='cvat-action-phase-track-surface'
                                aria-label={`Seek on ${label.name} track`}
                                tabIndex={-1}
                                onClick={(event) => {
                                    onActivate(id);
                                    if (event.detail) onSeek(positionAt(event.currentTarget, event.clientX));
                                }}
                                onDoubleClick={(event) => {
                                    onRecord(label, positionAt(event.currentTarget, event.clientX));
                                }}
                            />
                            {trackPhases.map((phase) => {
                                const chosen = phase.id === selectedID;
                                const hoveredEdge = edgeHover?.id === phase.id ? edgeHover.edge : null;
                                const range = preview?.id === phase.id ? preview.range : phase;
                                const title = `${label.name} · ${range.start}–${range.stop - 1}`;
                                return (
                                    <div
                                        key={phase.id}
                                        className='cvat-action-phase-clip'
                                        style={style(range)}
                                        onPointerEnter={(event) => pointAtEdge(event, phase.id)}
                                        onPointerMove={(event) => pointAtEdge(event, phase.id)}
                                        onPointerLeave={() => aimAt(null)}
                                    >
                                        <Button
                                            type='default'
                                            size='small'
                                            className='cvat-action-phase-segment'
                                            aria-pressed={chosen}
                                            title={title}
                                            onClick={(event) => {
                                                if (!event.detail || !suppressClick.current) onSelect(phase);
                                                suppressClick.current = false;
                                            }}
                                            style={{ backgroundColor: label.color, color: '#fff' }}
                                            {...pointerHandlers(phase, 'move')}
                                        >
                                            {label.name}
                                        </Button>
                                        {(chosen || hoveredEdge || preview?.id === phase.id) && !phase.locked &&
                                            (['start', 'end'] as const).map((edge) => (
                                                <button
                                                    key={edge}
                                                    type='button'
                                                    className={`cvat-action-phase-handle
                                                        cvat-action-phase-handle-${edge}`}
                                                    aria-label={`Drag ${edge} of ${label.name}`}
                                                    data-edge-target={hoveredEdge === edge}
                                                    tabIndex={-1}
                                                    {...pointerHandlers(phase, edge)}
                                                />
                                            ))}
                                    </div>
                                );
                            })}
                            {draft && (
                                <div
                                    className='cvat-action-phase-draft'
                                    data-end-frame={draftStop - 1}
                                    data-pending-end={
                                        draft.temporaryEnd !== undefined || draft.previewEnd !== undefined
                                    }
                                    style={{
                                        ...style({ start: draft.start, stop: draftStop }),
                                        backgroundColor: label.color ? `${label.color}48` : undefined,
                                    }}
                                >
                                    <Button
                                        type='text'
                                        size='small'
                                        className='cvat-action-phase-draft-body'
                                        aria-label={`Draft ${label.name}`}
                                        title={`${label.name} · ${draft.start}–${draftStop - 1}`.concat(
                                            ' · Double-click to confirm',
                                        )}
                                        onClick={(event) => {
                                            if (event.detail) onActivate(id);
                                            else onRecord(label, draftStop - 1);
                                        }}
                                        onDoubleClick={() => onRecord(label, draftStop - 1)}
                                    />
                                    <button
                                        type='button'
                                        className='cvat-action-phase-handle cvat-action-phase-handle-end'
                                        aria-label={`Drag recording end of ${label.name}`}
                                        onPointerDown={(event) => {
                                            event.currentTarget.setPointerCapture(event.pointerId);
                                        }}
                                        onPointerMove={(event) => {
                                            const handle = event.currentTarget;
                                            if (!handle.hasPointerCapture(event.pointerId) || !event.buttons) return;
                                            const track = handle.closest('.cvat-action-phase-timeline');
                                            if (track) {
                                                onDraftEnd(id, Math.max(draft.start, positionAt(track, event.clientX)));
                                            }
                                        }}
                                        onDoubleClick={() => onRecord(label, draftStop - 1)}
                                    />
                                </div>
                            )}
                            <span className='cvat-action-phase-playhead' style={{ left: `${percent(frame + 0.5)}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
