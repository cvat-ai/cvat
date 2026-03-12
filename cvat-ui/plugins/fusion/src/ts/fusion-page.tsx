// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RouteComponentProps, useLocation } from 'react-router-dom';
import Layout from 'antd/lib/layout';
import Slider from 'antd/lib/slider';
import Spin from 'antd/lib/spin';
import Typography from 'antd/lib/typography';
import Row from 'antd/lib/row';
import Col from 'antd/lib/col';
import Alert from 'antd/lib/alert';
import Modal from 'antd/lib/modal';
import notification from 'antd/lib/notification';

import { getCore } from './index';
import EditableCanvas2DPanel from './panels/editable-canvas2d-panel';
import EditableCanvas3DPanel from './panels/editable-canvas3d-panel';
import FusionToolbar from './panels/fusion-toolbar';
import LinkControls from './panels/link-controls';
import AnnotationList from './panels/annotation-list';
import { getLinkIdFromState, linkIdToColor } from './utils/color';
import { LINK_ID_ATTR_NAME } from './consts';

const { Title } = Typography;

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// Canvas2DHandle (from editable-canvas2d-panel):
// interface Canvas2DHandle {
//     startDraw(shapeType: string, label: any): void;
//     cancelDraw(): void;
//     activate(clientID: number | null): void;
//     getMode(): string;
// }
//
// Canvas3DHandle (from editable-canvas3d-panel):
// interface Canvas3DHandle {
//     startDraw(label: any): void;
//     cancelDraw(): void;
//     activate(clientID: number | null): void;
//     getMode(): string;
// }

interface MatchParams {
    projectId?: string;
}

type Props = RouteComponentProps<MatchParams>;

function FusionPage(props: Props): JSX.Element {
    const { match } = props;
    const location = useLocation();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

    // Support both /fusion?task2d=X&task3d=Y and legacy /fusion/:projectId
    const task2dParam = queryParams.get('task2d');
    const task3dParam = queryParams.get('task3d');
    const projectIdParam = match.params.projectId;
    const isTaskMode = !!(task2dParam && task3dParam);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [job2d, setJob2d] = useState<any>(null);
    const [job3d, setJob3d] = useState<any>(null);
    const [frame, setFrame] = useState(0);
    const [maxFrame, setMaxFrame] = useState(0);
    const [annotations2d, setAnnotations2d] = useState<any[]>([]);
    const [annotations3d, setAnnotations3d] = useState<any[]>([]);
    const [selected2d, setSelected2d] = useState<any>(null);
    const [selected3d, setSelected3d] = useState<any>(null);
    const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
    const [headerLabel, setHeaderLabel] = useState<string>('Fusion Viewer');
    const [activeControl, setActiveControl] = useState<'select' | 'draw2d' | 'draw3d'>('select');
    const [selectedLabel, setSelectedLabel] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [pendingLinkSource, setPendingLinkSource] = useState<
        { panel: '2d' | '3d'; clientID: number } | null
    >(null);

    const canvas2dRef = useRef<any>(null);
    const canvas3dRef = useRef<any>(null);

    // ------------------------------------------------------------------
    // Job initialization — supports both task-based and project-based modes
    // ------------------------------------------------------------------
    useEffect(() => {
        let cancelled = false;

        async function initFromTasks(t2dId: number, t3dId: number): Promise<void> {
            const core = getCore();
            const tasks2d = await core.tasks.get({ id: t2dId });
            const tasks3d = await core.tasks.get({ id: t3dId });
            const task2d = tasks2d[0];
            const task3d = tasks3d[0];

            if (!task2d) { setError(`2D task #${t2dId} not found`); return; }
            if (!task3d) { setError(`3D task #${t3dId} not found`); return; }

            // First discover job IDs, then re-fetch by jobID so labels are included
            const jobsList2d = await core.jobs.get({ taskID: task2d.id });
            const jobsList3d = await core.jobs.get({ taskID: task3d.id });

            if (cancelled) return;
            if (!jobsList2d.length || !jobsList3d.length) {
                setError('Could not find jobs for both 2D and 3D tasks.');
                return;
            }

            // Re-fetch by jobID to ensure labels are populated
            const [fullJob2d] = await core.jobs.get({ jobID: jobsList2d[0].id });
            const [fullJob3d] = await core.jobs.get({ jobID: jobsList3d[0].id });

            if (cancelled) return;
            setJob2d(fullJob2d);
            setJob3d(fullJob3d);
            setMaxFrame(Math.min(task2d.size, task3d.size) - 1);
            setHeaderLabel(`Fusion Viewer — 2D #${task2d.id} + 3D #${task3d.id}`);

            // Auto-select the first label
            if (fullJob2d.labels?.length) {
                setSelectedLabel(fullJob2d.labels[0]);
            }
        }

        async function initFromProject(pid: number): Promise<void> {
            const core = getCore();
            const [project] = await core.projects.get({ id: pid });
            if (!project) { setError(`Project #${pid} not found`); return; }

            const tasks = await core.tasks.get({ projectId: project.id });
            const task2d = tasks.find((t: any) => t.dimension === '2d');
            const task3d = tasks.find((t: any) => t.dimension === '3d');

            if (!task2d || !task3d) {
                setError('This project must contain at least one 2D task and one 3D task.');
                return;
            }

            const jobsList2d = await core.jobs.get({ taskID: task2d.id });
            const jobsList3d = await core.jobs.get({ taskID: task3d.id });

            if (cancelled) return;
            if (!jobsList2d.length || !jobsList3d.length) {
                setError('Could not find jobs for both 2D and 3D tasks.');
                return;
            }

            const [fullJob2d] = await core.jobs.get({ jobID: jobsList2d[0].id });
            const [fullJob3d] = await core.jobs.get({ jobID: jobsList3d[0].id });

            if (cancelled) return;
            setJob2d(fullJob2d);
            setJob3d(fullJob3d);
            setMaxFrame(Math.min(task2d.size, task3d.size) - 1);
            setHeaderLabel(`Fusion Viewer — Project #${pid}`);

            // Auto-select the first label
            if (fullJob2d.labels?.length) {
                setSelectedLabel(fullJob2d.labels[0]);
            }
        }

        async function init(): Promise<void> {
            try {
                if (isTaskMode) {
                    await initFromTasks(Number(task2dParam), Number(task3dParam));
                } else if (projectIdParam) {
                    await initFromProject(Number(projectIdParam));
                } else {
                    setError(
                        'Missing parameters. Use /fusion?task2d=<id>&task3d=<id> '
                        + 'or /fusion/<projectId>',
                    );
                }
            } catch (err: any) {
                if (!cancelled) {
                    setError(err?.message ?? String(err));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        init();
        return () => { cancelled = true; };
    }, [task2dParam, task3dParam, projectIdParam, isTaskMode]);

    // ------------------------------------------------------------------
    // Fetch annotations when frame or jobs change (with link-id colour coding)
    // ------------------------------------------------------------------
    useEffect(() => {
        let cancelled = false;

        async function fetchAnnotations(): Promise<void> {
            if (!job2d || !job3d) return;

            try {
                const [ann2d, ann3d] = await Promise.all([
                    job2d.annotations.get(frame),
                    job3d.annotations.get(frame),
                ]);
                if (cancelled) return;

                // Apply link-id colour coding
                ann2d.forEach((s: any) => { s.color = linkIdToColor(getLinkIdFromState(s)); });
                ann3d.forEach((s: any) => { s.color = linkIdToColor(getLinkIdFromState(s)); });

                setAnnotations2d(ann2d);
                setAnnotations3d(ann3d);
            } catch (err: any) {
                if (!cancelled) {
                    notification.error({
                        message: 'Failed to load annotations',
                        description: err?.message,
                    });
                }
            }
        }

        fetchAnnotations();
        return () => { cancelled = true; };
    }, [frame, job2d, job3d]);

    // When selectedLinkId changes, auto-select paired annotations
    useEffect(() => {
        if (!selectedLinkId) return;

        const paired2d = annotations2d.find(
            (s: any) => getLinkIdFromState(s) === selectedLinkId,
        );
        const paired3d = annotations3d.find(
            (s: any) => getLinkIdFromState(s) === selectedLinkId,
        );

        if (paired2d) setSelected2d(paired2d);
        if (paired3d) setSelected3d(paired3d);
    }, [selectedLinkId, annotations2d, annotations3d]);

    // ------------------------------------------------------------------
    // Refresh annotations helper (with colour coding)
    // ------------------------------------------------------------------
    const refreshAnnotations = useCallback(async () => {
        if (!job2d || !job3d) return;
        const [ann2d, ann3d] = await Promise.all([
            job2d.annotations.get(frame),
            job3d.annotations.get(frame),
        ]);
        ann2d.forEach((s: any) => { s.color = linkIdToColor(getLinkIdFromState(s)); });
        ann3d.forEach((s: any) => { s.color = linkIdToColor(getLinkIdFromState(s)); });
        setAnnotations2d(ann2d);
        setAnnotations3d(ann3d);
    }, [frame, job2d, job3d]);

    // ------------------------------------------------------------------
    // Auto-link helpers
    // ------------------------------------------------------------------
    const performAutoLink = useCallback(async (
        state2d: any,
        state3d: any,
    ): Promise<void> => {
        const spec2d = state2d.label?.attributes?.find(
            (attr: any) => attr.name === LINK_ID_ATTR_NAME,
        );
        const spec3d = state3d.label?.attributes?.find(
            (attr: any) => attr.name === LINK_ID_ATTR_NAME,
        );

        if (!spec2d || !spec3d) {
            notification.warning({
                message: 'Cannot auto-link',
                description: `Both labels must have a "${LINK_ID_ATTR_NAME}" attribute.`,
            });
            return;
        }

        const uuid = generateUUID();
        state2d.attributes[spec2d.id] = uuid;
        state3d.attributes[spec3d.id] = uuid;

        await Promise.all([
            job2d.annotations.put([state2d]),
            job3d.annotations.put([state3d]),
        ]);

        setPendingLinkSource(null);
        setSelectedLinkId(uuid);
        await refreshAnnotations();

        notification.success({ message: 'Annotations linked automatically' });
    }, [job2d, job3d, refreshAnnotations]);

    // ------------------------------------------------------------------
    // Draw orchestration
    // ------------------------------------------------------------------
    const handleStartDraw2d = useCallback((label: any) => {
        setActiveControl('draw2d');
        setSelectedLabel(label);
        canvas2dRef.current?.startDraw('rectangle', label);
    }, []);

    const handleStartDraw3d = useCallback((label: any) => {
        setActiveControl('draw3d');
        setSelectedLabel(label);
        canvas3dRef.current?.startDraw(label);
    }, []);

    const handleCancelDraw = useCallback(() => {
        setActiveControl('select');
        canvas2dRef.current?.cancelDraw();
        canvas3dRef.current?.cancelDraw();
    }, []);

    // ------------------------------------------------------------------
    // Annotation created handlers
    // ------------------------------------------------------------------
    const handleAnnotationCreated2d = useCallback(async (drawState: any) => {
        if (!job2d || !selectedLabel) return;
        try {
            const ObjectState = getCore().classes.ObjectState;
            const objectState = new ObjectState({
                frame,
                objectType: 'shape',
                shapeType: drawState.shapeType || 'rectangle',
                points: drawState.points,
                label: selectedLabel,
                zOrder: drawState.zOrder || 0,
            });

            await job2d.annotations.put([objectState]);
            await refreshAnnotations();
            setActiveControl('select');

            // Auto-link prompt
            const createdClientID = objectState.clientID;
            setPendingLinkSource({ panel: '2d', clientID: createdClientID });
            Modal.confirm({
                title: 'Link this annotation?',
                content: 'Click an annotation in the 3D panel to link them.',
                okText: 'Waiting for selection…',
                okButtonProps: { disabled: true },
                cancelText: 'Skip',
                onCancel: () => setPendingLinkSource(null),
            });
        } catch (err: any) {
            notification.error({
                message: 'Failed to create 2D annotation',
                description: err?.message,
            });
        }
    }, [job2d, selectedLabel, frame, refreshAnnotations]);

    const handleAnnotationCreated3d = useCallback(async (drawState: any) => {
        if (!job3d || !selectedLabel) return;
        try {
            const ObjectState = getCore().classes.ObjectState;
            const objectState = new ObjectState({
                frame,
                objectType: drawState.objectType || 'shape',
                shapeType: 'cuboid',
                points: drawState.points,
                label: selectedLabel,
                attributes: drawState.attributes || {},
            });

            await job3d.annotations.put([objectState]);
            await refreshAnnotations();
            setActiveControl('select');

            // Auto-link prompt
            const createdClientID = objectState.clientID;
            setPendingLinkSource({ panel: '3d', clientID: createdClientID });
            Modal.confirm({
                title: 'Link this annotation?',
                content: 'Click an annotation in the 2D panel to link them.',
                okText: 'Waiting for selection…',
                okButtonProps: { disabled: true },
                cancelText: 'Skip',
                onCancel: () => setPendingLinkSource(null),
            });
        } catch (err: any) {
            notification.error({
                message: 'Failed to create 3D annotation',
                description: err?.message,
            });
        }
    }, [job3d, selectedLabel, frame, refreshAnnotations]);

    // ------------------------------------------------------------------
    // Annotation edited handlers
    // ------------------------------------------------------------------
    const handleAnnotationEdited2d = useCallback(async (
        state: any,
        points: number[],
        rotation: number,
    ) => {
        try {
            state.points = points;
            state.rotation = rotation;
            await state.save();
            await refreshAnnotations();
        } catch (err: any) {
            notification.error({
                message: 'Failed to update 2D annotation',
                description: err?.message,
            });
        }
    }, [refreshAnnotations]);

    const handleAnnotationEdited3d = useCallback(async (state: any, points: number[]) => {
        try {
            state.points = points;
            await state.save();
            await refreshAnnotations();
        } catch (err: any) {
            notification.error({
                message: 'Failed to update 3D annotation',
                description: err?.message,
            });
        }
    }, [refreshAnnotations]);

    // ------------------------------------------------------------------
    // Selection + cross-panel sync
    // ------------------------------------------------------------------
    const handleSelect2d = useCallback(async (clientID: number) => {
        const state = annotations2d.find((s: any) => s.clientID === clientID);
        if (!state) return;
        setSelected2d(state);

        const lid = getLinkIdFromState(state);
        if (lid) {
            setSelectedLinkId(lid);
            // Activate linked 3D partner
            const partner = annotations3d.find(
                (s: any) => getLinkIdFromState(s) === lid,
            );
            if (partner) {
                canvas3dRef.current?.activate(partner.clientID);
            }
        }

        // Auto-link: if pending source is from 3D, link it with this 2D annotation
        if (pendingLinkSource?.panel === '3d') {
            const source3d = annotations3d.find(
                (s: any) => s.clientID === pendingLinkSource.clientID,
            );
            if (source3d) {
                Modal.destroyAll();
                await performAutoLink(state, source3d);
            }
        }
    }, [annotations2d, annotations3d, pendingLinkSource, performAutoLink]);

    const handleSelect3d = useCallback(async (clientID: number) => {
        const state = annotations3d.find((s: any) => s.clientID === clientID);
        if (!state) return;
        setSelected3d(state);

        const lid = getLinkIdFromState(state);
        if (lid) {
            setSelectedLinkId(lid);
            // Activate linked 2D partner
            const partner = annotations2d.find(
                (s: any) => getLinkIdFromState(s) === lid,
            );
            if (partner) {
                canvas2dRef.current?.activate(partner.clientID);
            }
        }

        // Auto-link: if pending source is from 2D, link it with this 3D annotation
        if (pendingLinkSource?.panel === '2d') {
            const source2d = annotations2d.find(
                (s: any) => s.clientID === pendingLinkSource.clientID,
            );
            if (source2d) {
                Modal.destroyAll();
                await performAutoLink(source2d, state);
            }
        }
    }, [annotations2d, annotations3d, pendingLinkSource, performAutoLink]);

    const handleSelectLinkId = useCallback((linkId: string | null) => {
        setSelectedLinkId(linkId);
    }, []);

    // ------------------------------------------------------------------
    // Link / Unlink / Save
    // ------------------------------------------------------------------
    const handleLink = useCallback(async () => {
        if (!selected2d || !selected3d) return;

        try {
            const uuid = generateUUID();

            // Find link_id attribute spec on 2D label
            const spec2d = selected2d.label?.attributes?.find(
                (attr: any) => attr.name === LINK_ID_ATTR_NAME,
            );
            // Find link_id attribute spec on 3D label
            const spec3d = selected3d.label?.attributes?.find(
                (attr: any) => attr.name === LINK_ID_ATTR_NAME,
            );

            if (!spec2d || !spec3d) {
                notification.error({
                    message: 'Cannot link',
                    description: `Both labels must have a "${LINK_ID_ATTR_NAME}" attribute.`,
                });
                return;
            }

            selected2d.attributes[spec2d.id] = uuid;
            selected3d.attributes[spec3d.id] = uuid;

            await Promise.all([
                job2d.annotations.put([selected2d]),
                job3d.annotations.put([selected3d]),
            ]);

            setSelectedLinkId(uuid);
            await refreshAnnotations();

            notification.success({ message: 'Annotations linked' });
        } catch (err: any) {
            notification.error({ message: 'Link failed', description: err?.message });
        }
    }, [selected2d, selected3d, job2d, job3d, refreshAnnotations]);

    const handleUnlink = useCallback(async () => {
        if (!selectedLinkId) return;

        try {
            const state2d = annotations2d.find(
                (s: any) => getLinkIdFromState(s) === selectedLinkId,
            );
            const state3d = annotations3d.find(
                (s: any) => getLinkIdFromState(s) === selectedLinkId,
            );

            const promises: Promise<any>[] = [];

            if (state2d) {
                const spec = state2d.label?.attributes?.find(
                    (attr: any) => attr.name === LINK_ID_ATTR_NAME,
                );
                if (spec) {
                    state2d.attributes[spec.id] = '';
                    promises.push(job2d.annotations.put([state2d]));
                }
            }

            if (state3d) {
                const spec = state3d.label?.attributes?.find(
                    (attr: any) => attr.name === LINK_ID_ATTR_NAME,
                );
                if (spec) {
                    state3d.attributes[spec.id] = '';
                    promises.push(job3d.annotations.put([state3d]));
                }
            }

            await Promise.all(promises);

            setSelectedLinkId(null);
            setSelected2d(null);
            setSelected3d(null);
            await refreshAnnotations();

            notification.success({ message: 'Annotations unlinked' });
        } catch (err: any) {
            notification.error({ message: 'Unlink failed', description: err?.message });
        }
    }, [selectedLinkId, annotations2d, annotations3d, job2d, job3d, refreshAnnotations]);

    const handleSave = useCallback(async () => {
        if (!job2d || !job3d) return;
        try {
            setSaving(true);
            await Promise.all([
                job2d.annotations.save(),
                job3d.annotations.save(),
            ]);
            notification.success({ message: 'Annotations saved' });
        } catch (err: any) {
            notification.error({ message: 'Save failed', description: err?.message });
        } finally {
            setSaving(false);
        }
    }, [job2d, job3d]);

    // ------------------------------------------------------------------
    // Keyboard shortcuts
    // ------------------------------------------------------------------
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent): void {
            // Ignore shortcuts when typing in input / textarea elements
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;

            if (e.key === 'n' || e.key === 'N') {
                if (selectedLabel) {
                    handleStartDraw2d(selectedLabel);
                }
            } else if (e.key === 'm' || e.key === 'M') {
                if (selectedLabel) {
                    handleStartDraw3d(selectedLabel);
                }
            } else if (e.key === 'Escape') {
                handleCancelDraw();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        }

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedLabel, handleStartDraw2d, handleStartDraw3d, handleCancelDraw, handleSave]);

    // ---------- Render ----------

    if (loading) {
        return (
            <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
            }}
            >
                <Spin size='large' tip='Loading project data…' />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 32 }}>
                <Alert type='error' showIcon message='Fusion Viewer Error' description={error} />
            </div>
        );
    }

    return (
        <Layout style={{ height: '100vh', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #e8e8e8',
                background: '#fff',
            }}
            >
                <Title level={4} style={{ margin: 0 }}>
                    {headerLabel}
                </Title>
            </div>

            {/* Toolbar */}
            <FusionToolbar
                labels={job2d?.labels || []}
                activeControl={activeControl}
                selectedLabel={selectedLabel}
                onStartDraw2d={handleStartDraw2d}
                onStartDraw3d={handleStartDraw3d}
                onCancelDraw={handleCancelDraw}
                onSave={handleSave}
                onLabelChange={setSelectedLabel}
                saving={saving}
            />

            {/* Frame slider */}
            <div style={{ padding: '4px 16px 0' }}>
                <Slider
                    min={0}
                    max={maxFrame}
                    value={frame}
                    onChange={(val: number) => setFrame(val)}
                    tipFormatter={(val) => `Frame ${val}`}
                />
            </div>

            {/* Panels — side by side */}
            <Row style={{ flex: 1, minHeight: 0, overflow: 'hidden' }} gutter={0}>
                <Col span={12} style={{ height: '100%' }}>
                    <EditableCanvas2DPanel
                        ref={canvas2dRef}
                        job={job2d}
                        frame={frame}
                        annotations={annotations2d}
                        onAnnotationCreated={handleAnnotationCreated2d}
                        onAnnotationEdited={handleAnnotationEdited2d}
                        onSelectAnnotation={handleSelect2d}
                    />
                </Col>
                <Col span={12} style={{ height: '100%' }}>
                    <EditableCanvas3DPanel
                        ref={canvas3dRef}
                        job={job3d}
                        frame={frame}
                        annotations={annotations3d}
                        onAnnotationCreated={handleAnnotationCreated3d}
                        onAnnotationEdited={handleAnnotationEdited3d}
                        onSelectAnnotation={handleSelect3d}
                    />
                </Col>
            </Row>

            {/* Link controls */}
            <LinkControls
                selected2d={selected2d}
                selected3d={selected3d}
                selectedLinkId={selectedLinkId}
                onLink={handleLink}
                onUnlink={handleUnlink}
                onSave={handleSave}
            />

            {/* Annotation list */}
            <AnnotationList
                annotations2d={annotations2d}
                annotations3d={annotations3d}
                selectedLinkId={selectedLinkId}
                onSelectLinkId={handleSelectLinkId}
            />
        </Layout>
    );
}

export default FusionPage;
