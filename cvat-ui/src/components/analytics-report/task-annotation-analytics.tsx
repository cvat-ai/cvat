// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Card from 'antd/lib/card';
import Select from 'antd/lib/select';
import Button from 'antd/lib/button';
import Spin from 'antd/lib/spin';
import Alert from 'antd/lib/alert';
import Empty from 'antd/lib/empty';
import Tag from 'antd/lib/tag';
import Badge from 'antd/lib/badge';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import { ReloadOutlined } from '@ant-design/icons';

interface ClassCount {
    label_id: number;
    label_name: string;
    color: string;
    count: number;
}

interface AnalyticsResponse {
    task_id: number;
    total_annotations: number;
    shape_type: string | null;
    counts: ClassCount[];
}

interface Props {
    taskId: number;
}

type WsStatus = 'connected' | 'reconnecting' | 'disconnected';

const SHAPE_OPTIONS = [
    { label: 'All Shapes', value: '' },
    { label: 'Rectangle (Box)', value: 'rectangle' },
    { label: 'Polygon', value: 'polygon' },
    { label: 'Polyline', value: 'polyline' },
    { label: 'Points', value: 'points' },
    { label: 'Ellipse', value: 'ellipse' },
    { label: 'Cuboid', value: 'cuboid' },
    { label: 'Skeleton', value: 'skeleton' },
    { label: 'Mask', value: 'mask' },
];

export default function TaskAnnotationAnalytics({ taskId }: Props): JSX.Element {
    const [data, setData] = useState<AnalyticsResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedShape, setSelectedShape] = useState<string>('');
    const [wsStatus, setWsStatus] = useState<WsStatus>('disconnected');

    const isMountedRef = useRef<boolean>(true);

    const fetchCounts = useCallback(async (isSilent = false) => {
        if (!isSilent) {
            setLoading(true);
        }
        setError(null);

        const params = new URLSearchParams();
        if (selectedShape) {
            params.append('shape_type', selectedShape);
        }

        const url = `/api/test/tasks/${taskId}/annotation-counts${params.toString() ? `?${params.toString()}` : ''}`;

        try {
            const response = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Authentication required. Please log in.');
                }
                if (response.status === 403) {
                    throw new Error('Access denied. You do not have permission to view this task.');
                }
                if (response.status === 404) {
                    throw new Error('Task not found.');
                }
                const errJson = await response.json().catch(() => ({}));
                throw new Error(errJson.error || errJson.detail || `Server returned error (${response.status})`);
            }

            const json: AnalyticsResponse = await response.json();
            if (isMountedRef.current) {
                setData(json);
            }
        } catch (err: any) {
            if (isMountedRef.current) {
                setError(err.message || 'Failed to fetch annotation analytics');
                setData(null);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [taskId, selectedShape]);

    // Initial and filter-change fetch
    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);

    // Live WebSocket connection and automatic recovery
    useEffect(() => {
        isMountedRef.current = true;
        let socket: WebSocket | null = null;
        let reconnectTimer: NodeJS.Timeout | null = null;
        let retryAttempt = 0;

        function connect() {
            if (!isMountedRef.current) return;
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/test/ws/tasks/${taskId}`;

            try {
                socket = new WebSocket(wsUrl);

                socket.onopen = () => {
                    if (!isMountedRef.current) return;
                    setWsStatus('connected');
                    retryAttempt = 0;
                    // Reconcile on connection or recovery
                    fetchCounts(true);
                };

                socket.onmessage = (event) => {
                    if (!isMountedRef.current) return;
                    try {
                        const payload = JSON.parse(event.data);
                        if (payload.event === 'annotations_changed') {
                            fetchCounts(true);
                        }
                    } catch {
                        // ignore heartbeat or invalid payload
                    }
                };

                socket.onclose = () => {
                    if (!isMountedRef.current) return;
                    setWsStatus('reconnecting');
                    scheduleReconnect();
                };

                socket.onerror = () => {
                    if (!isMountedRef.current) return;
                    setWsStatus('reconnecting');
                    if (socket) {
                        socket.close();
                    }
                };
            } catch {
                if (isMountedRef.current) {
                    setWsStatus('reconnecting');
                    scheduleReconnect();
                }
            }
        }

        function scheduleReconnect() {
            if (!isMountedRef.current) return;
            const delay = Math.min(1000 * Math.pow(1.5, retryAttempt), 10000);
            retryAttempt += 1;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
                connect();
            }, delay);
        }

        connect();

        return () => {
            isMountedRef.current = false;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (socket) {
                socket.onclose = null;
                socket.onerror = null;
                socket.close();
            }
        };
    }, [taskId, fetchCounts]);

    const maxCount = data && data.counts.length > 0
        ? Math.max(...data.counts.map((c) => c.count))
        : 1;

    return (
        <div className='cvat-task-annotation-analytics' style={{ padding: '24px' }}>
            <Card
                title={<Title level={4} style={{ margin: 0 }}>Annotation Class Distribution</Title>}
                extra={(
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {wsStatus === 'connected' && (
                            <Tag color='success' style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                                <Badge status='processing' color='#52c41a' /> Live Sync
                            </Tag>
                        )}
                        {wsStatus === 'reconnecting' && (
                            <Tag color='warning' style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                                <Badge status='warning' /> Reconnecting...
                            </Tag>
                        )}
                        {wsStatus === 'disconnected' && (
                            <Tag color='default' style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                                <Badge status='default' /> Offline
                            </Tag>
                        )}

                        <Select
                            value={selectedShape}
                            onChange={(val) => setSelectedShape(val)}
                            options={SHAPE_OPTIONS}
                            style={{ width: 170 }}
                            placeholder='Filter by Shape'
                        />
                        <Button icon={<ReloadOutlined />} onClick={() => fetchCounts(false)} disabled={loading}>
                            Refresh
                        </Button>
                    </div>
                )}
                style={{ width: '100%', borderRadius: '4px' }}
            >
                {loading && (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                        <Spin size='large' tip='Loading annotation counts...' />
                    </div>
                )}

                {!loading && error && (
                    <Alert
                        type='error'
                        showIcon
                        message='Error Loading Analytics'
                        description={error}
                        action={(
                            <Button size='small' danger onClick={() => fetchCounts(false)}>
                                Retry
                            </Button>
                        )}
                        style={{ margin: '16px 0' }}
                    />
                )}

                {!loading && !error && data && data.total_annotations === 0 && (
                    <Empty
                        description='No annotations found for this task'
                        style={{ padding: '48px 0' }}
                    />
                )}

                {!loading && !error && data && data.total_annotations > 0 && (
                    <div>
                        <div style={{ marginBottom: '20px' }}>
                            <Text type='secondary'>
                                Total annotations: <Text strong>{data.total_annotations}</Text> across {data.counts.length} classes
                            </Text>
                        </div>

                        <div className='analytics-graph-container' style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {data.counts.map((item) => {
                                const percentage = Math.round((item.count / data.total_annotations) * 100);
                                const barWidth = Math.max(4, Math.round((item.count / maxCount) * 100));
                                const barColor = item.color || '#1890ff';

                                return (
                                    <div key={item.label_id} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: '140px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <Text strong title={item.label_name}>{item.label_name}</Text>
                                        </div>

                                        <div style={{ flex: 1, backgroundColor: '#f0f0f0', borderRadius: '4px', height: '24px', overflow: 'hidden' }}>
                                            <div
                                                style={{
                                                    width: `${barWidth}%`,
                                                    height: '100%',
                                                    backgroundColor: barColor,
                                                    transition: 'width 0.3s ease',
                                                }}
                                            />
                                        </div>

                                        <div style={{ width: '100px', textAlign: 'left' }}>
                                            <Text>{item.count} ({percentage}%)</Text>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
