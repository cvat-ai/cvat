// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Title from 'antd/lib/typography/Title';
import Table from 'antd/lib/table';
import Result from 'antd/lib/result';
import Empty from 'antd/lib/empty';
import Button from 'antd/lib/button';
import Select from 'antd/lib/select';
import Space from 'antd/lib/space';
import Badge from 'antd/lib/badge';
import Text from 'antd/lib/typography/Text';
import notification from 'antd/lib/notification';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title as ChartTitle,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { getCore, Job, Task } from 'cvat-core-wrapper';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import GoBackButton from 'components/common/go-back-button';
import { fetchTask } from 'utils/fetch';
import ResourceLink from 'components/common/resource-link';

import './styles.scss';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

const core = getCore();
const CHART_TOP_N = 25;
const ALL_JOBS = 'all';

interface ClassCountRow {
    label: string;
    count: number;
}

interface ClassCountsResponse {
    task_id: number;
    job_id: number | null;
    counts: ClassCountRow[];
}

type LiveStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

function formatLoadError(err: unknown): Error {
    if (err instanceof Error) {
        const withCode = err as Error & { code?: number };
        if (typeof withCode.code === 'number') {
            return new Error(`Request failed (${withCode.code}): ${withCode.message}`);
        }
        return withCode;
    }
    return new Error(String(err));
}

function ClassCountsPage(): JSX.Element {
    const taskId = +useParams<{ tid: string }>().tid;
    const [task, setTask] = useState<Task | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJob, setSelectedJob] = useState<string>(ALL_JOBS);
    const [counts, setCounts] = useState<ClassCountRow[]>([]);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [reloadToken, setReloadToken] = useState(0);
    const [liveStatus, setLiveStatus] = useState<LiveStatus>('connecting');
    const [lastLiveUpdate, setLastLiveUpdate] = useState<string | null>(null);
    const [chartNonce, setChartNonce] = useState(0);
    const selectedJobRef = useRef(selectedJob);
    selectedJobRef.current = selectedJob;

    const retry = useCallback(() => {
        setReloadToken((value) => value + 1);
    }, []);

    const fetchCounts = useCallback(async (options?: { quiet?: boolean }): Promise<void> => {
        const quiet = options?.quiet ?? false;
        try {
            if (!quiet) {
                setFetching(true);
                setError(null);
            }

            const job = selectedJobRef.current;
            const query = job === ALL_JOBS
                ? `/api/test/tasks/${taskId}/class-counts`
                : `/api/test/tasks/${taskId}/class-counts?job_id=${job}`;

            const [fetchedTask, jobList, response] = await Promise.all([
                fetchTask(taskId),
                core.jobs.get({ taskID: taskId }),
                core.server.request(query, { method: 'GET' }),
            ]);

            const payload = (response?.data ?? response) as ClassCountsResponse;
            setTask(fetchedTask);
            setJobs(Array.isArray(jobList) ? jobList : []);
            setCounts(Array.isArray(payload?.counts) ? payload.counts : []);
            setError(null);
        } catch (err) {
            if (!quiet) {
                setTask(null);
                setCounts([]);
                setError(formatLoadError(err));
            }
        } finally {
            if (!quiet) {
                setFetching(false);
            }
        }
    }, [taskId]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (cancelled) {
                return;
            }
            await fetchCounts({ quiet: false });
        })();
        return () => {
            cancelled = true;
        };
    }, [taskId, reloadToken, selectedJob, fetchCounts]);

    // WebSocket live updates (#8) with reconnect (#9)
    useEffect(() => {
        let closed = false;
        let socket: WebSocket | null = null;
        let retryDelay = 1000;
        let reconnectTimer: number | undefined;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${window.location.host}/api/test/ws/tasks/${taskId}/class-counts`;

        const connect = (): void => {
            if (closed) {
                return;
            }
            setLiveStatus((prev) => (prev === 'live' ? 'live' : 'connecting'));
            socket = new WebSocket(url);

            socket.onopen = () => {
                if (closed) {
                    return;
                }
                retryDelay = 1000;
                setLiveStatus('live');
            };

            socket.onmessage = (event: MessageEvent) => {
                try {
                    const data = JSON.parse(String(event.data));
                    if (data?.type === 'annotations_changed') {
                        const jobFilter = selectedJobRef.current;
                        if (
                            jobFilter === ALL_JOBS ||
                            data.job_id == null ||
                            String(data.job_id) === jobFilter
                        ) {
                            fetchCounts({ quiet: true }).then(() => {
                                const stamp = new Date().toLocaleTimeString();
                                setLastLiveUpdate(stamp);
                                setChartNonce((n) => n + 1);
                                notification.success({
                                    message: 'Class counts updated live',
                                    description: `Annotations changed (${data.action || 'update'}) · ${stamp}`,
                                    placement: 'bottomRight',
                                    duration: 2.5,
                                });
                            });
                        }
                    }
                } catch {
                    // ignore malformed payloads
                }
            };

            socket.onclose = () => {
                if (closed) {
                    return;
                }
                setLiveStatus('reconnecting');
                reconnectTimer = window.setTimeout(() => {
                    retryDelay = Math.min(retryDelay * 2, 15000);
                    connect();
                }, retryDelay);
            };

            socket.onerror = () => {
                socket?.close();
            };
        };

        connect();

        return () => {
            closed = true;
            if (reconnectTimer) {
                window.clearTimeout(reconnectTimer);
            }
            if (socket) {
                socket.onclose = null;
                socket.close();
            }
            setLiveStatus('offline');
        };
    }, [taskId, fetchCounts]);

    const total = useMemo(
        () => counts.reduce((sum, row) => sum + row.count, 0),
        [counts],
    );
    const isEmpty = !fetching && !error && total === 0;

    const chartRows = useMemo(
        () => [...counts]
            .filter((row) => row.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, CHART_TOP_N),
        [counts],
    );

    const chartData = useMemo(() => ({
        labels: chartRows.map((row) => row.label),
        datasets: [
            {
                label: 'Annotations',
                data: chartRows.map((row) => row.count),
                backgroundColor: 'rgba(24, 144, 255, 0.65)',
                borderColor: 'rgba(24, 144, 255, 1)',
                borderWidth: 1,
            },
        ],
    }), [chartRows]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: {
                display: true,
                text: `Top ${chartRows.length} classes by annotation count`,
            },
        },
        scales: {
            x: {
                ticks: {
                    maxRotation: 60,
                    minRotation: 45,
                    autoSkip: false,
                },
            },
            y: {
                beginAtZero: true,
                ticks: { precision: 0 },
            },
        },
    }), [chartRows.length]);

    const jobOptions = useMemo(() => [
        { value: ALL_JOBS, label: 'All jobs (whole task)' },
        ...jobs.map((job) => ({
            value: String(job.id),
            label: `Job #${job.id}`,
        })),
    ], [jobs]);

    const liveBadgeStatus = liveStatus === 'live'
        ? 'success'
        : liveStatus === 'reconnecting' || liveStatus === 'connecting'
            ? 'warning'
            : 'default';
    const liveBadgeText = liveStatus === 'live'
        ? 'Live'
        : liveStatus === 'reconnecting'
            ? 'Reconnecting…'
            : liveStatus === 'connecting'
                ? 'Connecting…'
                : 'Offline';

    const backNavigation = (
        <Row justify='center'>
            <Col span={22} xl={18} xxl={14}>
                <GoBackButton />
            </Col>
        </Row>
    );

    if (error) {
        return (
            <div className='cvat-class-counts-page'>
                <div className='cvat-class-counts-page-error'>
                    <Result
                        status='error'
                        title='Could not load class counts'
                        subTitle={error.message}
                        extra={(
                            <div className='cvat-class-counts-error-actions'>
                                <Button type='primary' onClick={retry}>
                                    Retry
                                </Button>
                                <GoBackButton />
                            </div>
                        )}
                    />
                </div>
            </div>
        );
    }

    if (fetching && !task) {
        return (
            <div className='cvat-class-counts-page'>
                <div className='cvat-class-counts-loading'>
                    <CVATLoadingSpinner />
                </div>
            </div>
        );
    }

    return (
        <div className='cvat-class-counts-page'>
            {backNavigation}
            <Row justify='center' className='cvat-class-counts-inner-wrapper'>
                <Col span={22} xl={18} xxl={14} className='cvat-class-counts-inner'>
                    <Title level={4} className='cvat-text-color'>
                        {'Class counts for '}
                        {task ? <ResourceLink resource={task} /> : `task #${taskId}`}
                    </Title>
                    <Space className='cvat-class-counts-filters' wrap>
                        <Badge status={liveBadgeStatus} text={liveBadgeText} />
                        <Text type='secondary'>Filter by job</Text>
                        <Select
                            className='cvat-class-counts-job-select'
                            value={selectedJob}
                            options={jobOptions}
                            onChange={(value: string) => setSelectedJob(value)}
                            disabled={fetching}
                        />
                        <Text type='secondary'>
                            {fetching
                                ? 'Loading…'
                                : `${counts.length} classes · ${total} annotations total`}
                        </Text>
                        {lastLiveUpdate ? (
                            <Text type='success'>
                                {`Last live update: ${lastLiveUpdate}`}
                            </Text>
                        ) : null}
                    </Space>

                    {isEmpty ? (
                        <div className='cvat-class-counts-empty'>
                            <Empty
                                description={(
                                    <span>
                                        No annotations for this
                                        {selectedJob === ALL_JOBS ? ' task' : ' job'}
                                        {' '}
                                        yet.
                                        <br />
                                        Upload or draw annotations, then refresh this page.
                                    </span>
                                )}
                            >
                                <Button type='primary' onClick={retry}>
                                    Refresh
                                </Button>
                            </Empty>
                        </div>
                    ) : (
                        <>
                            <div className='cvat-class-counts-chart'>
                                <Bar key={chartNonce} data={chartData} options={chartOptions} />
                            </div>
                            <Table
                                className='cvat-class-counts-table'
                                rowKey='label'
                                size='middle'
                                pagination={{ pageSize: 20, hideOnSinglePage: true }}
                                dataSource={counts}
                                columns={[
                                    {
                                        title: 'Class',
                                        dataIndex: 'label',
                                        key: 'label',
                                        sorter: (a: ClassCountRow, b: ClassCountRow) => (
                                            a.label.localeCompare(b.label)
                                        ),
                                    },
                                    {
                                        title: 'Annotations',
                                        dataIndex: 'count',
                                        key: 'count',
                                        width: 160,
                                        defaultSortOrder: 'descend',
                                        sorter: (a: ClassCountRow, b: ClassCountRow) => (
                                            a.count - b.count
                                        ),
                                    },
                                ]}
                            />
                        </>
                    )}
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(ClassCountsPage);
