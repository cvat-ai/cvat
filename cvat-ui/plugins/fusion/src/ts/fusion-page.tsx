// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RouteComponentProps, useLocation } from 'react-router-dom';
import Layout from 'antd/lib/layout';
import Slider from 'antd/lib/slider';
import Spin from 'antd/lib/spin';
import Typography from 'antd/lib/typography';
import Row from 'antd/lib/row';
import Col from 'antd/lib/col';
import Alert from 'antd/lib/alert';
import Button from 'antd/lib/button';
import notification from 'antd/lib/notification';
import { SaveOutlined } from '@ant-design/icons';

import { getCore } from './index';
import Canvas2DPanel from './panels/canvas2d-panel';
import Canvas3DPanel from './panels/canvas3d-panel';
import LinkControls from './panels/link-controls';
import AnnotationList from './panels/annotation-list';
import { getLinkIdFromState } from './utils/color';
import { LINK_ID_ATTR_NAME } from './consts';

const { Title } = Typography;

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

interface MatchParams {
    projectId?: string;
}

type Props = RouteComponentProps<MatchParams>;

function FusionPage(props: Props): JSX.Element {
    const { match } = props;
    const location = useLocation();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

    // Support both /fusion?task2d=X&task3d=Y  and legacy /fusion/:projectId
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

    // Load tasks/jobs on mount — supports both task-based and legacy project-based modes
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

    // Fetch annotations when frame or jobs change
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
                setAnnotations2d(ann2d);
                setAnnotations3d(ann3d);
            } catch (err: any) {
                if (!cancelled) {
                    notification.error({ message: 'Failed to load annotations', description: err?.message });
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

    const handleSelect2d = useCallback((state: any) => {
        setSelected2d(state);
        const lid = getLinkIdFromState(state);
        if (lid) setSelectedLinkId(lid);
    }, []);

    const handleSelect3d = useCallback((state: any) => {
        setSelected3d(state);
        const lid = getLinkIdFromState(state);
        if (lid) setSelectedLinkId(lid);
    }, []);

    const handleSelectLinkId = useCallback((linkId: string | null) => {
        setSelectedLinkId(linkId);
    }, []);

    const refreshAnnotations = useCallback(async () => {
        if (!job2d || !job3d) return;
        const [ann2d, ann3d] = await Promise.all([
            job2d.annotations.get(frame),
            job3d.annotations.get(frame),
        ]);
        setAnnotations2d(ann2d);
        setAnnotations3d(ann3d);
    }, [frame, job2d, job3d]);

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
            await Promise.all([
                job2d.annotations.save(),
                job3d.annotations.save(),
            ]);
            notification.success({ message: 'Annotations saved' });
        } catch (err: any) {
            notification.error({ message: 'Save failed', description: err?.message });
        }
    }, [job2d, job3d]);

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
                <Button type='primary' icon={<SaveOutlined />} onClick={handleSave}>
                    Save
                </Button>
            </div>

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

            {/* Panels */}
            <Row style={{ flex: 1, minHeight: 0, overflow: 'hidden' }} gutter={0}>
                <Col span={12} style={{ height: '100%' }}>
                    <Canvas2DPanel
                        job={job2d}
                        frame={frame}
                        annotations={annotations2d}
                        selectedLinkId={selectedLinkId}
                        onSelectAnnotation={handleSelect2d}
                    />
                </Col>
                <Col span={12} style={{ height: '100%' }}>
                    <Canvas3DPanel
                        job={job3d}
                        frame={frame}
                        annotations={annotations3d}
                        selectedLinkId={selectedLinkId}
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
