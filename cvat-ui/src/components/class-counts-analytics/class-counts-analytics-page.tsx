// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/**
 * Class-Counts Analytics Page
 *
 * Route: /analytics/class-counts
 *
 * Features:
 *   - Project / Task / Job selector
 *   - Bar chart (react-chartjs-2) with live WebSocket updates
 *   - Connection status indicator (connected / reconnecting / offline)
 *   - Exponential backoff reconnect
 *   - REST resync after reconnect
 *   - Loading, empty, and error states
 *   - Cleans up WebSocket on unmount
 */

import './styles.scss';

import React, {
    useCallback, useEffect, useMemo, useRef, useState,
} from 'react';

import Alert from 'antd/lib/alert';
import Badge from 'antd/lib/badge';
import Card from 'antd/lib/card';
import Col from 'antd/lib/col';
import Row from 'antd/lib/row';
import Select from 'antd/lib/select';
import Space from 'antd/lib/space';
import Spin from 'antd/lib/spin';
import Table from 'antd/lib/table';
import Tabs from 'antd/lib/tabs';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import notification from 'antd/lib/notification';
import { WifiOutlined, DisconnectOutlined, SyncOutlined } from '@ant-design/icons';

import { getCore } from 'cvat-core-wrapper';

import ClassCountsChart from './class-counts-chart';
import {
    ClassCountItem,
    ConnectionStatus,
    ScopeParam,
    useClassCountsWS,
} from './use-class-counts-ws';

const core = getCore();

type ScopeType = 'project' | 'task' | 'job';

interface ScopeOption {
    value: number;
    label: string;
}

// ── Connection status badge ───────────────────────────────────────────────────

function ConnectionBadge({ status }: { status: ConnectionStatus }): JSX.Element {
    const config: Record<ConnectionStatus, { color: string; text: string; icon: React.ReactNode }> = {
        [ConnectionStatus.CONNECTED]: { color: '#52c41a', text: 'Live', icon: <WifiOutlined /> },
        [ConnectionStatus.CONNECTING]: { color: '#1677ff', text: 'Connecting…', icon: <SyncOutlined spin /> },
        [ConnectionStatus.RECONNECTING]: { color: '#faad14', text: 'Reconnecting…', icon: <SyncOutlined spin /> },
        [ConnectionStatus.OFFLINE]: { color: '#ff4d4f', text: 'Offline', icon: <DisconnectOutlined /> },
    };
    const { color, text, icon } = config[status];
    return (
        <Space className='cvat-class-counts-conn-badge'>
            <Badge color={color} />
            {icon}
            <Text style={{ color, fontSize: 13 }}>{text}</Text>
        </Space>
    );
}

// ── Summary table ─────────────────────────────────────────────────────────────

function ClassCountsTable({ counts }: { counts: ClassCountItem[] }): JSX.Element {
    const columns = [
        {
            title: '',
            dataIndex: 'color',
            width: 32,
            render: (color: string) => (
                <span
                    style={{
                        display: 'inline-block',
                        width: 16,
                        height: 16,
                        borderRadius: 3,
                        background: color || '#888',
                        border: '1px solid #555',
                    }}
                />
            ),
        },
        { title: 'Label', dataIndex: 'label_name', sorter: (a: ClassCountItem, b: ClassCountItem) => a.label_name.localeCompare(b.label_name) },
        { title: 'Distinct Frames', dataIndex: 'image_count', sorter: (a: ClassCountItem, b: ClassCountItem) => a.image_count - b.image_count },
        { title: 'Total Annotations', dataIndex: 'annotation_count', sorter: (a: ClassCountItem, b: ClassCountItem) => a.annotation_count - b.annotation_count },
    ];
    return (
        <Table
            dataSource={counts}
            columns={columns}
            rowKey='label_id'
            size='small'
            pagination={false}
            className='cvat-class-counts-table'
        />
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ClassCountsAnalyticsPage(): JSX.Element {
    const [scopeType, setScopeType] = useState<ScopeType>('task');
    const [scopeId, setScopeId] = useState<number | null>(null);
    const [options, setOptions] = useState<ScopeOption[]>([]);
    const [optionsLoading, setOptionsLoading] = useState(false);

    const [counts, setCounts] = useState<ClassCountItem[]>([]);
    const [restLoading, setRestLoading] = useState(false);
    const [restError, setRestError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    const scopeParam: ScopeParam | null = useMemo(() => {
        if (scopeId === null) return null;
        if (scopeType === 'project') return { project_id: scopeId };
        if (scopeType === 'task') return { task_id: scopeId };
        return { job_id: scopeId };
    }, [scopeType, scopeId]);

    // ── Load selector options ──────────────────────────────────────────────

    useEffect(() => {
        setOptions([]);
        setScopeId(null);
        setOptionsLoading(true);

        const load = async (): Promise<void> => {
            try {
                let items: { value: number, label: string }[] = [];
                if (scopeType === 'task') {
                    const tasks = await core.tasks.get({ page: 1 });
                    items = Array.from(tasks).map((t: any) => ({ value: t.id, label: `#${t.id} — ${t.name}` }));
                } else if (scopeType === 'project') {
                    const projects = await core.projects.get({ page: 1 });
                    items = Array.from(projects).map((p: any) => ({ value: p.id, label: `#${p.id} — ${p.name}` }));
                } else {
                    const jobs = await core.jobs.get({ page: 1 });
                    items = Array.from(jobs).map((j: any) => ({ value: j.id, label: `Job #${j.id}` }));
                }
                setOptions(items);
                if (items.length > 0) {
                    setScopeId(items[0].value);
                }
            } catch (err: any) {
                console.error('Error fetching scope options:', err);
                setOptions([]);
            } finally {
                setOptionsLoading(false);
            }
        };

        load();
    }, [scopeType]);

    // ── Initial REST fetch ────────────────────────────────────────────────

    const fetchREST = useCallback(async (): Promise<void> => {
        if (!scopeParam) return;
        setRestLoading(true);
        setRestError(null);
        try {
            const [scopeKey, scopeVal] = Object.entries(scopeParam)[0];
            const resp = await fetch(
                `/api/test/class-counts?${scopeKey}=${scopeVal}`,
                { credentials: 'include' },
            );
            if (!resp.ok) {
                if (resp.status === 403) throw new Error('Permission denied.');
                if (resp.status === 404) throw new Error('Resource not found.');
                throw new Error(`Server error: ${resp.status}`);
            }
            const data = await resp.json();
            setCounts(data.counts ?? []);
            setLastUpdated(new Date().toISOString());
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to fetch data.';
            setRestError(msg);
            notification.error({ message: 'Analytics fetch failed', description: msg });
        } finally {
            setRestLoading(false);
        }
    }, [scopeParam]);

    useEffect(() => {
        fetchREST();
    }, [fetchREST]);

    // ── WebSocket live updates ────────────────────────────────────────────

    const handleWsData = useCallback((data: ClassCountItem[]) => {
        setCounts(data);
        setLastUpdated(new Date().toISOString());
    }, []);

    const handleWsError = useCallback((msg: string) => {
        notification.warning({ message: 'Analytics WebSocket', description: msg, duration: 5 });
    }, []);

    // Session auth: no token in URL; browser sends session cookie automatically
    const wsStatus = useClassCountsWS({
        scope: scopeParam,
        token: null,
        onData: handleWsData,
        onError: handleWsError,
    });

    // Resync via REST when reconnected
    const prevStatus = useRef<ConnectionStatus>(wsStatus);
    useEffect(() => {
        if (
            prevStatus.current === ConnectionStatus.RECONNECTING &&
            wsStatus === ConnectionStatus.CONNECTED
        ) {
            fetchREST();
        }
        prevStatus.current = wsStatus;
    }, [wsStatus, fetchREST]);

    // ── Render ────────────────────────────────────────────────────────────

    const isLoading = restLoading && counts.length === 0;

    return (
        <div className='cvat-class-counts-page'>
            <Row justify='center' style={{ marginBottom: 24 }}>
                <Col span={22} xl={18} xxl={14}>
                    <Space className='cvat-class-counts-header' align='center' size='large'>
                        <Title level={3} style={{ margin: 0 }}>
                            Class-Wise Annotation Analytics
                        </Title>
                        <ConnectionBadge status={wsStatus} />
                    </Space>
                    {lastUpdated && (
                        <Text type='secondary' style={{ fontSize: 12 }}>
                            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
                        </Text>
                    )}
                </Col>
            </Row>

            <Row justify='center' style={{ marginBottom: 16 }}>
                <Col span={22} xl={18} xxl={14}>
                    <Card className='cvat-class-counts-selector-card'>
                        <Space size='middle' wrap>
                            <Select
                                id='class-counts-scope-type'
                                value={scopeType}
                                onChange={(v: ScopeType) => setScopeType(v)}
                                style={{ width: 140 }}
                                options={[
                                    { value: 'task', label: 'Task' },
                                    { value: 'project', label: 'Project' },
                                    { value: 'job', label: 'Job' },
                                ]}
                            />
                            <Select
                                id='class-counts-scope-id'
                                placeholder={`Select a ${scopeType}…`}
                                value={scopeId ?? undefined}
                                onChange={(v: number) => setScopeId(v)}
                                loading={optionsLoading}
                                options={options}
                                style={{ width: 320 }}
                                showSearch
                                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                            />
                        </Space>
                    </Card>
                </Col>
            </Row>

            <Row justify='center'>
                <Col span={22} xl={18} xxl={14}>
                    {restError && (
                        <Alert
                            type='error'
                            message={restError}
                            showIcon
                            closable
                            style={{ marginBottom: 16 }}
                        />
                    )}

                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: 64 }}>
                            <Spin size='large' tip='Fetching annotation data…' />
                        </div>
                    ) : (
                        <Card className='cvat-class-counts-chart-card'>
                            {restLoading && <SyncOutlined spin style={{
                                position: 'absolute', top: 16, right: 16, color: '#1677ff',
                            }} />}
                            <Tabs
                                defaultActiveKey='chart'
                                items={[
                                    {
                                        key: 'chart',
                                        label: 'Bar Chart',
                                        children: (
                                            <ClassCountsChart
                                                counts={counts}
                                                loading={restLoading && counts.length === 0}
                                            />
                                        ),
                                    },
                                    {
                                        key: 'table',
                                        label: 'Table',
                                        children: <ClassCountsTable counts={counts} />,
                                    },
                                ]}
                            />
                        </Card>
                    )}
                </Col>
            </Row>
        </div>
    );
}
