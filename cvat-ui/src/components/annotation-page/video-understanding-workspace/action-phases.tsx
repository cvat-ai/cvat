// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useEffect, useLayoutEffect, useRef, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    AppstoreOutlined, CaretRightOutlined, CloseOutlined, DeleteOutlined, DownloadOutlined, EditOutlined,
    EyeInvisibleOutlined, EyeOutlined, FastBackwardOutlined, FastForwardOutlined, PlusOutlined, SettingOutlined,
    VerticalAlignBottomOutlined,
} from '@ant-design/icons';
import Button from 'antd/lib/button';
import Checkbox from 'antd/lib/checkbox';
import InputNumber from 'antd/lib/input-number';
import Modal from 'antd/lib/modal';
import notification from 'antd/lib/notification';
import Popover from 'antd/lib/popover';
import Select from 'antd/lib/select';
import Text from 'antd/lib/typography/Text';

import CVATTooltip from 'components/common/cvat-tooltip';

import {
    AnnotationActionTypes, changeFrameAsync, fetchAnnotationsAsync, getJobAsync, saveAnnotationsAsync, switchPlay,
} from 'actions/annotation-actions';
import { shortcutsActions } from 'actions/shortcuts-actions';
import {
    AudioIntervalState, getCore, Job, Label, LabelType, Source,
} from 'cvat-core-wrapper';
import { getCVATStore } from 'cvat-store';
import { CombinedState, Workspace } from 'reducers';
import { conflictDetector } from 'utils/conflict-detector';
import { ThunkDispatch } from 'utils/redux';
import ActionTrackDialog from './action-track-dialog';
import { ACTION_KEYS, actionShortcutID, getShortcutCombination } from './phase-shortcuts';
import PhaseTimeline, { Edge, Hover } from './phase-timeline';
import {
    draftEnd, DraftRange, mergeClips, PhaseClip, Range,
} from './phase-clips';

type RecordingMode = 'toggle' | 'hold';
type Draft = DraftRange & { source: RecordingMode | 'manual' | 'shortcut-hold' };

export const phasePanelHeight = 240;

function downloadPhases(job: Job, phases: PhaseClip[]): void {
    const data = phases.map(({ label, start, stop }) => ({
        label: label.name,
        start_frame: start,
        end_frame: stop - 1,
    }));
    const url = URL.createObjectURL(new Blob(
        [JSON.stringify({ job_id: job.id, intervals: data }, null, 2)],
        { type: 'application/json' },
    ));
    const link = document.createElement('a');
    link.href = url;
    link.download = `job-${job.id}-action-phases.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isTyping(event: KeyboardEvent): boolean {
    return event.target instanceof HTMLElement && (
        event.target.isContentEditable || !!event.target.closest('input, select, textarea, [role="dialog"]')
    );
}

function isTrackNavigationTarget(target: EventTarget | null): boolean {
    return target instanceof Element && (
        target === document.body || !!target.closest(
            '.cvat-action-phase-track-label, .cvat-action-phase-timeline, .cvat-action-phase-seek, ' +
            '.cvat-video-workspace-content .cvat-canvas-grid-root',
        )
    );
}

interface Props {
    job: Job;
    showObjects: boolean;
    showTags: boolean;
    onShowObjects(enabled: boolean): void;
    onShowTags(enabled: boolean): void;
}

export default function ActionPhases(props: Props): JSX.Element {
    const {
        job, showObjects, showTags, onShowObjects, onShowTags,
    } = props;
    const dispatch = useDispatch<ThunkDispatch>();
    const frame = useSelector((state: CombinedState) => state.annotation.player.frame.number);
    const deleted = useSelector((state: CombinedState) => state.annotation.player.frame.data?.deleted);
    const intervals = useSelector((state: CombinedState) => state.audio.player.intervals);
    const playing = useSelector((state: CombinedState) => state.annotation.player.playing);
    const jobLabels = useSelector((state: CombinedState) => state.annotation.job.labels);
    const { keyMap, normalizedKeyMap } = useSelector((state: CombinedState) => state.shortcuts);
    const panel = useRef<HTMLElement>(null);
    const hovered = useRef<Hover | null>(null);
    const pending = useRef(Promise.resolve());
    const pendingRanges = useRef(new Map<number, Range>());
    const draftMap = useRef(new Map<number, Draft>());
    const heldShortcut = useRef<{ label: Label; startedPlayback: boolean; code: string } | null>(null);
    const heldActionKeys = useRef(new Map<string, Label>());
    const [drafts, setDrafts] = useState<ReadonlyMap<number, Draft>>(new Map());
    const activeTrackRef = useRef<number | null>(null);
    const [activeTrack, setActiveTrack] = useState<number | null>(null);
    const [hidden, setHidden] = useState<ReadonlySet<number>>(() => {
        try {
            const value: unknown = JSON.parse(localStorage.getItem(`cvat-hidden-action-tracks-${job.id}`) ?? '[]');
            return new Set(Array.isArray(value) ? value.filter(Number.isInteger) : []);
        } catch {
            return new Set();
        }
    });
    const [showHidden, setShowHidden] = useState(false);
    const [selectedID, setSelectedID] = useState<number | null>(null);
    const [edge, setEdge] = useState<Edge>('end');
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState('');
    const [mode, setMode] = useState<RecordingMode>(() => (
        localStorage.getItem('cvat-phase-key-mode') === 'hold' ? 'hold' : 'toggle'
    ));
    const [trackDialog, setTrackDialog] = useState<{ label?: Label; slot: number | null } | null>(null);
    const labels = jobLabels.filter((label) => label.type === LabelType.INTERVAL && !label.deleted);
    const label = labels.find(({ id }) => id === activeTrack);
    const phases = mergeClips(intervals, job.stopFrame + 1);
    const selected = phases.find(({ id }) => id === selectedID);
    const live = label ? drafts.get(label.id as number) : undefined;
    const hiddenCount = labels.filter(({ id }) => hidden.has(id as number)).length;
    const visibleLabels = labels.filter(({ id }) => (
        !hidden.has(id as number) || showHidden || drafts.has(id as number) || activeTrack === id
    ));
    const slots = new Map(labels.slice(0, ACTION_KEYS.length).map(({ id }, index) => [id as number, index]));
    const bindings = new Map([...slots].map(([id, slot]) => [
        id, normalizedKeyMap[actionShortcutID(slot)]?.slice(1, -1) || '',
    ]));

    useEffect(() => {
        dispatch(fetchAnnotationsAsync());
    }, [dispatch, job]);

    useEffect(() => {
        localStorage.setItem('cvat-phase-key-mode', mode);
    }, [mode]);

    useEffect(() => {
        const store = getCVATStore();
        let previous = store.getState().annotation.player;
        return store.subscribe(() => {
            const state = store.getState().annotation;
            if (state.job.instance !== job) return;
            const { player } = state;
            const playbackChanged = player.playing !== previous.playing;
            const steppedForward = player.frame.nextFrameStep && player.frame.number > previous.frame.number;
            previous = player;
            if (!draftMap.current.size || (!playbackChanged && !steppedForward)) return;

            for (const [id, draft] of draftMap.current) {
                if (playbackChanged) {
                    // Capture the displayed frame before any scrub or frame step.
                    draftMap.current.set(id, {
                        ...draft,
                        previewEnd: undefined,
                        temporaryEnd: player.playing ? undefined : Math.max(draft.start, player.frame.number),
                    });
                } else if (draft.temporaryEnd !== undefined) {
                    draftMap.current.set(id, { ...draft, temporaryEnd: undefined });
                }
            }
            setDrafts(new Map(draftMap.current));
        });
    }, [job]);

    const { startFrame, stopFrame } = job;
    const total = stopFrame - startFrame + 1;
    const gaps: Range[] = [];
    let next = startFrame;
    for (const phase of phases) {
        if (next < phase.start) gaps.push({ start: next, stop: phase.start });
        next = Math.max(next, phase.stop);
    }
    if (next <= stopFrame) gaps.push({ start: next, stop: stopFrame + 1 });
    const unmarked = gaps.reduce((count, gap) => count + gap.stop - gap.start, 0);
    const active = new Set(phases.filter((phase) => phase.start <= frame && frame < phase.stop)
        .map((phase) => phase.label.name));

    function seek(position: number): void {
        dispatch(switchPlay(false));
        dispatch(changeFrameAsync(position));
    }

    function togglePlayback(): void {
        const { player } = getCVATStore().getState().annotation;
        if (player.playing || player.frame.number < stopFrame) dispatch(switchPlay(!player.playing));
    }

    function activate(id: number | null): void {
        activeTrackRef.current = id;
        setActiveTrack(id);
        setSelectedID(null);
        setEditing(false);
        setError('');
    }

    function switchTrack(direction: number): void {
        const trackIDs = [null, ...visibleLabels.map(({ id }) => id as number)];
        const current = Math.max(0, trackIDs.indexOf(activeTrackRef.current));
        const nextTrack = trackIDs[(current + direction + trackIDs.length) % trackIDs.length];
        activate(nextTrack);
        const row = nextTrack === null ? '.cvat-action-phase-playback' : `[data-track-id="${nextTrack}"]`;
        panel.current?.querySelector<HTMLButtonElement>(`${row} .cvat-action-phase-track-label`)
            ?.focus({ preventScroll: true });
    }

    function setVisibility(id: number): void {
        const nextHidden = new Set(hidden);
        if (nextHidden.has(id)) nextHidden.delete(id);
        else {
            nextHidden.add(id);
            if (id === activeTrack) activate(null);
        }
        setHidden(nextHidden);
        if (!nextHidden.size) setShowHidden(false);
        localStorage.setItem(`cvat-hidden-action-tracks-${job.id}`, JSON.stringify([...nextHidden]));
    }

    function select(phase: PhaseClip): void {
        const hover = hovered.current;
        activate(phase.label.id as number);
        setSelectedID(phase.id);
        setEdge(hover?.id === phase.id ? hover.edge : 'end');
        setEditing(false);
        setError('');
        seek(phase.start);
    }

    function valid(range: Range): boolean {
        if (Number.isInteger(range.start) && Number.isInteger(range.stop) &&
            range.start >= startFrame && range.stop <= stopFrame + 1 && range.start < range.stop) return true;
        setError(`Enter a start and end within frames ${startFrame}–${stopFrame}.`);
        return false;
    }

    function change(action: () => Promise<void>): void {
        setError('');
        // Several digits can finish on the same frame. Apply all changes to this job in order.
        pending.current = pending.current.then(async () => {
            await action();
            const state = getCVATStore().getState().annotation;
            if (state.job.instance === job && state.workspace === Workspace.VIDEO_UNDERSTANDING) {
                await dispatch(fetchAnnotationsAsync());
            }
        }).catch((reason) => {
            setError(reason instanceof Error ? reason.message : String(reason));
        });
    }

    function updateDraft(id: number, recording?: Draft): void {
        if (recording) draftMap.current.set(id, recording);
        else draftMap.current.delete(id);
        setDrafts(new Map(draftMap.current));
    }

    function startDraft(target: Label, source: Draft['source'], position?: number): void {
        const { player } = getCVATStore().getState().annotation;
        if ((position === undefined && player.frame.data?.deleted) || draftMap.current.has(target.id as number)) return;
        const start = position ?? player.frame.number;
        activate(target.id as number);
        updateDraft(target.id as number, { start, source });
    }

    async function storeClip(target: Label, range: Range, replaced: AudioIntervalState[] = []): Promise<number> {
        const current = await job.annotations.intervals([]);
        const replacedIDs = new Set(replaced.map(({ clientID }) => clientID));
        const previous = current.filter(({ clientID }) => replacedIDs.has(clientID));
        if (replaced.length && !previous.length) throw new Error('Select the updated clip before editing it again.');

        const related = mergeClips(current.filter((item) => (
            item.label.id === target.id && !replacedIDs.has(item.clientID)
        )), stopFrame + 1).filter((clip) => clip.start <= range.stop && range.start <= clip.stop);

        if (!previous.length && related.length === 1 && related[0].members.length === 1 &&
            related[0].start <= range.start && related[0].stop >= range.stop) {
            return related[0].id;
        }

        const absorbed = [...previous, ...related.flatMap((clip) => clip.members)];
        if (absorbed.some((item) => item.lock)) throw new Error('The new range overlaps a locked clip.');
        const start = Math.min(range.start, ...related.map((clip) => clip.start));
        const stop = Math.max(range.stop, ...related.map((clip) => clip.stop));
        if (absorbed.length === 1) {
            const [state] = absorbed;
            state.start = start;
            state.stop = stop;
            await state.save();
            return state.clientID as number;
        }
        if (!absorbed.length) {
            const [id] = await job.annotations.put([
                AudioIntervalState.create({
                    label: target, start, stop, source: Source.MANUAL,
                }),
            ]);
            return id;
        }
        const removed = await Promise.all(absorbed.map((item) => item.export()));
        const { attributes, group, score } = removed[0];
        await job.annotations.commit({
            intervals: [{
                label_id: target.id as number, start, stop, source: Source.MANUAL, attributes, group, score,
            }],
        }, { intervals: removed }, null);
        const merged = (await job.annotations.intervals([])).find((item) => (
            item.label.id === target.id && item.start === start && item.stop === stop
        ));
        if (!merged) throw new Error('Could not select the merged clip.');
        return merged.clientID as number;
    }

    function finishDraft(target: Label, position?: number): void {
        const id = target.id as number;
        const draft = draftMap.current.get(id);
        if (!draft) return;
        const { player } = getCVATStore().getState().annotation;
        const current = position ?? draftEnd(draft, player.frame.number);
        const end = draft.source === 'hold' || draft.source === 'shortcut-hold' ?
            Math.max(draft.start, current) : current;
        if (!valid({ start: draft.start, stop: end + 1 })) return;
        updateDraft(id);
        change(async () => {
            try {
                const clientID = await storeClip(target, { start: draft.start, stop: end + 1 });
                if (activeTrackRef.current === id) setSelectedID(clientID);
            } catch (reason) {
                if (!draftMap.current.has(id)) updateDraft(id, draft);
                throw reason;
            }
        });
    }

    function record(target: Label, position?: number): void {
        if (draftMap.current.has(target.id as number)) finishDraft(target, position);
        else startDraft(target, 'manual', position);
    }

    async function saveTrack(name: string, color: string, override?: string[]): Promise<void> {
        if (!trackDialog) return;
        const shortcutID = trackDialog.slot === null ? null : actionShortcutID(trackDialog.slot);
        const currentKeyMap = getCVATStore().getState().shortcuts.keyMap;
        if (shortcutID && override) {
            const conflicts = conflictDetector({
                [shortcutID]: { ...currentKeyMap[shortcutID], sequences: override },
            }, currentKeyMap);
            if (conflicts) {
                throw new Error(`Shortcut already used by ${Object.values(conflicts).map((item) => item.name).join(', ')}.`);
            }
        }

        if (!trackDialog.label) {
            const created = await job.addLabel(new Label({
                name, color, type: LabelType.INTERVAL, attributes: [],
            }));
            dispatch({ type: AnnotationActionTypes.SYNC_JOB_LABELS, payload: { job } });
            activate(created.id as number);
        }
        if (shortcutID && override) dispatch(shortcutsActions.updateSequence(shortcutID, override));
    }

    async function requestDeleteTrack(target: Label): Promise<void> {
        await pending.current;
        const state = getCVATStore().getState().annotation;
        if (state.job.instance !== job || state.workspace !== Workspace.VIDEO_UNDERSTANDING) return;
        if (draftMap.current.size) {
            notification.info({ message: 'Finish or discard active recordings before deleting a track.' });
            return;
        }

        const scope = job.projectId === null ? 'task' : 'project';
        const hasFrameChanges = !!Object.keys(state.job.meta?.getUpdated() ?? {}).length;
        const willSave = job.annotations.hasUnsavedChanges() || hasFrameChanges;
        Modal.confirm({
            title: `Delete action track "${target.name}"?`,
            content: (
                <>
                    <p>{`This permanently removes the label and all of its intervals across this ${scope}.`}</p>
                    {willSave && <p>Your current annotation edits will be saved first.</p>}
                </>
            ),
            okText: willSave ? 'Save and delete' : 'Delete track',
            okButtonProps: { danger: true },
            onOk: async () => {
                const current = getCVATStore().getState().annotation;
                if (current.job.instance !== job || current.annotations.saving.uploading) {
                    notification.error({ message: 'Wait for the current save to finish and try again.' });
                    throw new Error('The job is busy.');
                }

                dispatch(switchPlay(false));
                try {
                    if (willSave) await dispatch(saveAnnotationsAsync());
                    await job.deleteLabel(target);
                } catch (reason) {
                    notification.error({
                        message: 'Could not delete the action track',
                        description: reason instanceof Error ? reason.message : String(reason),
                    });
                    throw reason;
                }

                await dispatch(getJobAsync({
                    taskID: job.taskId,
                    jobID: job.id,
                    initialFrame: current.player.frame.number,
                    initialFilters: current.annotations.filters,
                    queryParameters: {
                        initialWorkspace: Workspace.VIDEO_UNDERSTANDING,
                        initialOpenGuide: false,
                        defaultLabel: null,
                        defaultPointsCount: null,
                        defaultRotated: false,
                    },
                }));
            },
        });
    }

    function startHeldShortcut(target: Label, code: string): void {
        if (heldShortcut.current) return;
        const id = target.id as number;
        const current = draftMap.current.get(id);
        if (current?.source === 'hold') return;

        const { playing: wasPlaying, frame: position } = getCVATStore().getState().annotation.player;
        if (current) updateDraft(id, { ...current, source: 'shortcut-hold' });
        else startDraft(target, 'shortcut-hold');
        if (draftMap.current.get(id)?.source !== 'shortcut-hold') return;

        const startedPlayback = !wasPlaying && position.number < stopFrame;
        heldShortcut.current = { label: target, startedPlayback, code };
        if (startedPlayback) dispatch(switchPlay(true));
    }

    function finishHeldShortcut(): boolean {
        const held = heldShortcut.current;
        if (!held) return false;
        heldShortcut.current = null;
        if (draftMap.current.get(held.label.id as number)?.source === 'shortcut-hold') finishDraft(held.label);
        if (held.startedPlayback) dispatch(switchPlay(false));
        return true;
    }

    function updateClip(phase: PhaseClip, range: Range, seekTo?: number): void {
        if (phase.locked || !valid(range)) return;
        const { id } = phase;
        activeTrackRef.current = phase.label.id as number;
        setActiveTrack(activeTrackRef.current);
        setSelectedID(id);
        setEditing(false);
        pendingRanges.current.set(id, range);
        change(async () => {
            try {
                const savedID = await storeClip(phase.label, range, phase.members);
                if (activeTrackRef.current === phase.label.id) setSelectedID(savedID);
            } finally {
                if (pendingRanges.current.get(id) === range) pendingRanges.current.delete(id);
            }
        });
        if (seekTo !== undefined) seek(seekTo);
    }

    function nudge(delta: number): boolean {
        const hover = hovered.current;
        const phase = phases.find(({ id }) => id === hover?.id) ?? selected;
        if (!phase || phase.locked) return false;
        const side = hover?.id === phase.id ? hover.edge : edge;
        const queued = pendingRanges.current.get(phase.id);
        const start = queued?.start ?? phase.start;
        const end = queued?.stop ?? phase.stop;
        const range = side === 'start' ?
            { start: Math.max(startFrame, Math.min(end - 1, start - delta)), stop: end } :
            { start, stop: Math.min(stopFrame + 1, Math.max(start + 1, end + delta)) };
        setEdge(side);
        if (range.start !== start || range.stop !== end) {
            updateClip(phase, range, side === 'start' ? range.start : range.stop - 1);
        }
        return true;
    }

    const keyboard = useRef<{
        down(event: KeyboardEvent): void;
        up(event: KeyboardEvent): void;
        blur(): void;
    }>();
    useLayoutEffect(() => {
        keyboard.current = {
            down(event) {
                if (isTyping(event)) return;
                const modalOpen = Array.from(document.querySelectorAll<HTMLElement>('.ant-modal'))
                    .some((modal) => modal.getClientRects().length > 0);
                if (modalOpen) return;

                const combination = getShortcutCombination(event);
                const plainOperator = !event.ctrlKey && !event.metaKey && !event.altKey;
                const plus = plainOperator && (event.key === '+' || event.key === '=');
                const minus = plainOperator && event.key === '-';
                const normalized = combination?.split('+').sort().join('+');
                const matches = (id: string): boolean => !!keyMap[id]?.sequences.some((sequence) => (
                    (sequence === '+' && plus) || (sequence === '-' && minus) ||
                    (!!normalized && sequence.split('+').sort().join('+') === normalized)
                ));
                const consume = (): void => {
                    event.preventDefault();
                    event.stopPropagation();
                };

                if (isTrackNavigationTarget(event.target)) {
                    if (event.key === 'Tab' && !event.ctrlKey && !event.altKey && !event.metaKey) {
                        if (!visibleLabels.length) return;
                        consume();
                        if (!event.repeat) switchTrack(event.shiftKey ? -1 : 1);
                        return;
                    }
                    if (event.key === 'Escape' && event.target !== document.body) {
                        consume();
                        panel.current?.querySelector<HTMLButtonElement>('.cvat-action-phase-recording-settings')?.focus();
                        return;
                    }
                }

                if (matches('VIDEO_PLAYBACK_TRACK')) {
                    consume();
                    if (!event.repeat) activate(null);
                    return;
                }
                if (matches('VIDEO_ACTION_HOLD') || matches('VIDEO_ACTION_TOGGLE')) {
                    consume();
                    const target = labels.find(({ id }) => id === activeTrackRef.current);
                    if (!target || event.repeat) return;
                    if (matches('VIDEO_ACTION_HOLD')) startHeldShortcut(target, event.code);
                    else if (!heldShortcut.current) record(target);
                    return;
                }
                const track = labels.slice(0, ACTION_KEYS.length).find((_, index) => matches(actionShortcutID(index)));
                if (track) {
                    consume();
                    if (event.repeat) return;
                    const id = track.id as number;
                    activate(id);
                    const draft = draftMap.current.get(id);
                    if (!draft) {
                        startDraft(track, mode);
                        if (mode === 'hold' && draftMap.current.has(id)) heldActionKeys.current.set(event.code, track);
                    } else if (mode === 'toggle' && (draft.source === 'toggle' || draft.source === 'manual')) {
                        finishDraft(track);
                    }
                    return;
                }
                if ((matches('VIDEO_EXTEND_EDGE') && nudge(1)) || (matches('VIDEO_TRIM_EDGE') && nudge(-1))) consume();
            },
            up(event) {
                if (event.code === heldShortcut.current?.code && finishHeldShortcut()) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                const target = heldActionKeys.current.get(event.code);
                heldActionKeys.current.delete(event.code);
                if (target && draftMap.current.get(target.id as number)?.source === 'hold') finishDraft(target);
            },
            blur() {
                finishHeldShortcut();
                heldActionKeys.current.clear();
                for (const target of labels) {
                    if (draftMap.current.get(target.id as number)?.source === 'hold') finishDraft(target);
                }
            },
        };
    });
    useEffect(() => {
        const down = (event: KeyboardEvent): void => keyboard.current?.down(event);
        const up = (event: KeyboardEvent): void => keyboard.current?.up(event);
        const blur = (): void => keyboard.current?.blur();
        window.addEventListener('keydown', down, true);
        window.addEventListener('keyup', up, true);
        window.addEventListener('blur', blur);
        return () => {
            window.removeEventListener('keydown', down, true);
            window.removeEventListener('keyup', up, true);
            window.removeEventListener('blur', blur);
            if (heldShortcut.current?.startedPlayback && getCVATStore().getState().annotation.job.instance === job) {
                dispatch(switchPlay(false));
            }
        };
    }, [dispatch, job]);

    const recordingSettings = (
        <div className='cvat-action-phase-settings'>
            <Text>Recording</Text>
            <Select
                size='small'
                aria-label='Recording mode'
                value={mode}
                disabled={!!drafts.size}
                onChange={setMode}
                options={[{ value: 'toggle', label: 'Press to start/stop' }, { value: 'hold', label: 'Hold to record' }]}
            />
        </div>
    );
    const nextSlot = labels.length < ACTION_KEYS.length ? labels.length : null;
    const { colors } = getCore().enums;
    const toggleKey = normalizedKeyMap.VIDEO_ACTION_TOGGLE;
    const holdKey = normalizedKeyMap.VIDEO_ACTION_HOLD;
    const recordTooltip = live ? `Confirm action ${toggleKey}` :
        `Start action ${toggleKey} · Hold to play and record ${holdKey}`;

    const dialogShortcut = trackDialog?.slot == null ? undefined : actionShortcutID(trackDialog.slot);

    return (
        <section
            ref={panel}
            className='cvat-action-phases'
            style={{ height: phasePanelHeight }}
            aria-label='Video understanding'
        >
            <div className='cvat-action-phase-toolbar'>
                <Text strong>Action tracks</Text>
                <CVATTooltip title='Add an action track'>
                    <Button
                        type='text'
                        size='small'
                        icon={<PlusOutlined />}
                        aria-label='Add action track'
                        onClick={() => setTrackDialog({ slot: nextSlot })}
                    />
                </CVATTooltip>
                <CVATTooltip title={recordTooltip}>
                    <Button
                        type='text'
                        size='small'
                        aria-label={live ? 'Finish action' : 'Record action'}
                        icon={live ? <VerticalAlignBottomOutlined /> : <CaretRightOutlined />}
                        disabled={!label || deleted}
                        danger={!!live}
                        onClick={() => { if (label) record(label); }}
                    />
                </CVATTooltip>
                {live && (
                    <CVATTooltip title='Discard recording'>
                        <Button
                            type='text'
                            size='small'
                            icon={<CloseOutlined />}
                            aria-label='Discard recording'
                            onClick={() => updateDraft(label.id as number)}
                        />
                    </CVATTooltip>
                )}
                <div className='cvat-action-phase-coverage'>
                    <Text type='secondary'>{`${total - unmarked} / ${total} frames`}</Text>
                </div>
                <CVATTooltip title='Next gap'>
                    <Button type='text' size='small' icon={<FastForwardOutlined />} aria-label='Next gap'
                        disabled={!gaps.length}
                        onClick={() => {
                            const gap = gaps.find((item) => item.start > frame) ?? gaps[0];
                            if (gap) {
                                activate(null);
                                seek(gap.start);
                            }
                        }}
                    />
                </CVATTooltip>
                <CVATTooltip title={showHidden ? 'Collapse hidden tracks' : 'Show hidden tracks'}>
                    <Button
                        type='text'
                        size='small'
                        icon={showHidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        aria-label={showHidden ? 'Collapse hidden tracks' : 'Show hidden tracks'}
                        aria-pressed={showHidden}
                        disabled={!hiddenCount}
                        onClick={() => {
                            if (showHidden && activeTrack !== null && hidden.has(activeTrack)) activate(null);
                            setShowHidden(!showHidden);
                        }}
                    />
                </CVATTooltip>
                <CVATTooltip title='Export JSON'>
                    <Button
                        type='text'
                        size='small'
                        icon={<DownloadOutlined />}
                        aria-label='Export JSON'
                        disabled={!phases.length}
                        onClick={() => downloadPhases(job, phases)}
                    />
                </CVATTooltip>
                <Popover
                    content={(
                        <div className='cvat-action-phase-overlay-options'>
                            <Checkbox checked={showObjects} onChange={(event) => onShowObjects(event.target.checked)}>
                                Objects
                            </Checkbox>
                            <Checkbox checked={showTags} onChange={(event) => onShowTags(event.target.checked)}>
                                Frame tags
                            </Checkbox>
                        </div>
                    )}
                    trigger='click'
                    placement='topRight'
                >
                    <Button type='text' size='small' icon={<AppstoreOutlined />} aria-label='Canvas annotations' />
                </Popover>
                <Popover content={recordingSettings} trigger='click' placement='topRight'>
                    <Button
                        type='text'
                        size='small'
                        className='cvat-action-phase-recording-settings'
                        icon={<SettingOutlined />}
                        aria-label='Recording settings'
                    />
                </Popover>
            </div>
            <PhaseTimeline
                labels={visibleLabels}
                phases={phases}
                drafts={drafts}
                slots={slots}
                bindings={bindings}
                onEditShortcut={(target) => {
                    setTrackDialog({ label: target, slot: slots.get(target.id as number) ?? null });
                }}
                playbackShortcut={normalizedKeyMap.VIDEO_PLAYBACK_TRACK}
                onDeleteTrack={requestDeleteTrack}
                startFrame={startFrame}
                stopFrame={stopFrame}
                frame={frame}
                playing={playing}
                activeTrack={activeTrack}
                selectedID={selectedID}
                hidden={hidden}
                onActivate={activate}
                onPlay={togglePlayback}
                onVisibility={setVisibility}
                onRecord={record}
                onDraftEnd={(id, position) => {
                    const draft = draftMap.current.get(id);
                    if (!draft) return;
                    updateDraft(id, { ...draft, previewEnd: position });
                    seek(position);
                }}
                onSelect={select}
                onChange={updateClip}
                onHover={(target) => { hovered.current = target; }}
                onSeek={seek}
            />
            <div className='cvat-action-phase-details'>
                <Text type='secondary'>{`Frame ${frame}`}</Text>
                {active.size > 0 && <Text>{Array.from(active).join(', ')}</Text>}
                {error && <Text type='danger' role='alert'>{error}</Text>}
                {selected && editing && (
                    <form onSubmit={(event) => {
                        event.preventDefault();
                        const data = new FormData(event.currentTarget);
                        updateClip(selected, { start: Number(data.get('start')), stop: Number(data.get('end')) + 1 });
                    }}
                    >
                        <InputNumber size='small' name='start' aria-label='Start frame' required defaultValue={selected.start} />
                        <InputNumber size='small' name='end' aria-label='End frame' required defaultValue={selected.stop - 1} />
                        <Button htmlType='submit' size='small' type='primary'>Apply</Button>
                        <Button size='small' onClick={() => setEditing(false)}>Cancel</Button>
                    </form>
                )}
                {selected && !editing && (
                    <div>
                        <Text>{`${selected.label.name} · ${selected.start}–${selected.stop - 1}`}</Text>
                        <CVATTooltip title='Go to start'>
                            <Button type='text' size='small' icon={<FastBackwardOutlined />} aria-label='Go to start'
                                onClick={() => seek(selected.start)}
                            />
                        </CVATTooltip>
                        <CVATTooltip title='Go to end'>
                            <Button type='text' size='small' icon={<FastForwardOutlined />} aria-label='Go to end'
                                onClick={() => seek(selected.stop - 1)}
                            />
                        </CVATTooltip>
                        <CVATTooltip title='Edit range'>
                            <Button type='text' size='small' icon={<EditOutlined />} aria-label='Edit range'
                                disabled={selected.locked}
                                onClick={() => setEditing(true)}
                            />
                        </CVATTooltip>
                        <CVATTooltip title='Remove clip'>
                            <Button type='text' size='small' icon={<DeleteOutlined />} aria-label='Remove clip'
                                disabled={selected.locked}
                                onClick={() => {
                                    change(async () => {
                                        const records = await Promise.all(
                                            selected.members.map((item) => item.export()),
                                        );
                                        await job.annotations.commit({}, { intervals: records }, null);
                                        setSelectedID(null);
                                    });
                                }}
                            />
                        </CVATTooltip>
                        {(['start', 'end'] as const).map((side) => (
                            <CVATTooltip key={side} title={`Adjust ${side} edge with +/−`}>
                                <Button
                                    type={edge === side ? 'primary' : 'default'}
                                    size='small'
                                    aria-pressed={edge === side}
                                    onClick={() => {
                                        hovered.current = null;
                                        setEdge(side);
                                    }}
                                >
                                    {side === 'start' ? 'Start' : 'End'}
                                </Button>
                            </CVATTooltip>
                        ))}
                    </div>
                )}
            </div>
            {trackDialog && (
                <ActionTrackDialog
                    trackName={trackDialog.label?.name}
                    initialColor={trackDialog.label?.color ?? colors[labels.length % colors.length]}
                    slot={trackDialog.slot}
                    defaultKey={trackDialog.slot === null ? undefined : ACTION_KEYS[trackDialog.slot]}
                    initialKeys={dialogShortcut ? keyMap[dialogShortcut]?.sequences ?? [] : []}
                    onCancel={() => setTrackDialog(null)}
                    onSave={saveTrack}
                />
            )}
        </section>
    );
}
