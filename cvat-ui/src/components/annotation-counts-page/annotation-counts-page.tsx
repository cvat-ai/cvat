
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import {
    Alert,
    Card,
    Col,
    Empty,
    Row,
    Select,
    Spin,
    Typography,
} from 'antd';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface AnnotationCount {
    label: string;
    count: number;
}

interface AnnotationCountResponse {
    task_id: number;
    counts: AnnotationCount[];
}

const { Title, Text } = Typography;

function AnnotationCountsPage(): JSX.Element {
    const { tid } = useParams<{ tid: string }>();
    const taskId = Number(tid);

    const [counts, setCounts] = useState<AnnotationCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedLabel, setSelectedLabel] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        async function loadCounts(): Promise<void> {
            setLoading(true);
            setError('');

            try {
                const response = await fetch(
                    `/api/tasks/${taskId}/annotation-counts`,
                    {
                        credentials: 'same-origin',
                        signal: controller.signal,
                    },
                );

                if (!response.ok) {
                    throw new Error(
                        response.status === 403
                            ? 'You do not have access to this task.'
                            : response.status === 401
                                ? 'Please log in to view annotation counts.'
                                : `Unable to load data (${response.status}).`,
                    );
                }

                const result: AnnotationCountResponse = await response.json();
                setCounts(result.counts);
            } catch (err) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    setError(err.message || 'Something went wrong.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        if (!Number.isInteger(taskId) || taskId <= 0) {
            setError('Invalid task ID.');
            setLoading(false);
        } else {
            loadCounts();
        }

        return () => controller.abort();
    }, [taskId]);

    const filteredCounts = useMemo(
        () => selectedLabel
            ? counts.filter((item) => item.label === selectedLabel)
            : counts,
        [counts, selectedLabel],
    );

    const totalAnnotations = counts.reduce(
        (total, item) => total + item.count,
        0,
    );

    const chartData = {
        labels: filteredCounts.map((item) => item.label),
        datasets: [
            {
                label: 'Annotations',
                data: filteredCounts.map((item) => item.count),
                backgroundColor: '#64816b',
                hoverBackgroundColor: '#405d48',
                borderRadius: 7,
                maxBarThickness: 64,
            },
        ],
    };

    return (
        <div
            style={{
                maxWidth: 1200,
                margin: '0 auto',
                padding: '32px 24px',
                color: '#262d29',
            }}
        >
            <div style={{ marginBottom: 28 }}>
                <Text
                    style={{
                        color: '#64816b',
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                    }}
                >
                    Task insights
                </Text>

                <Title level={2} style={{ margin: '8px 0' }}>
                    Annotation Analytics
                </Title>

                <Text type="secondary">
                    Explore annotation distribution for Task #{taskId}.
                </Text>
            </div>

            {loading && (
                <Card>
                    <div style={{ textAlign: 'center', padding: 36 }}>
                        <Spin tip="Loading annotation data..." />
                    </div>
                </Card>
            )}

            {!loading && error && (
                <Alert
                    type="error"
                    showIcon
                    message="Unable to load analytics"
                    description={error}
                />
            )}

            {!loading && !error && (
                <>
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24} sm={12}>
                            <Card
                                bordered={false}
                                style={{
                                    borderRadius: 12,
                                    background: '#edf3ed',
                                    height: '100%',
                                }}
                            >
                                <Text type="secondary">Total annotations</Text>
                                <Title level={2} style={{ margin: '8px 0 0' }}>
                                    {totalAnnotations.toLocaleString()}
                                </Title>
                            </Card>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Card
                                bordered={false}
                                style={{
                                    borderRadius: 12,
                                    background: '#f4f0e7',
                                    height: '100%',
                                }}
                            >
                                <Text type="secondary">Unique labels</Text>
                                <Title level={2} style={{ margin: '8px 0 0' }}>
                                    {counts.length}
                                </Title>
                            </Card>
                        </Col>
                    </Row>

                    <Card
                        bordered={false}
                        style={{
                            borderRadius: 12,
                            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                        }}
                        title="Annotations by label"
                        extra={
                            <Text type="secondary">
                                Task #{taskId}
                            </Text>
                        }
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 16,
                                flexWrap: 'wrap',
                                marginBottom: 24,
                            }}
                        >
                            <Text type="secondary">
                                Search and select a label to filter the chart.
                            </Text>

                            <Select
                                showSearch
                                allowClear
                                value={selectedLabel || undefined}
                                placeholder="Search labels..."
                                style={{ width: 260, maxWidth: '100%' }}
                                options={counts.map((item) => ({
                                    label: item.label,
                                    value: item.label,
                                }))}
                                filterOption={(input, option) =>
                                    String(option?.label ?? '')
                                        .toLowerCase()
                                        .includes(input.toLowerCase())
                                }
                                onChange={(value) =>
                                    setSelectedLabel(value || '')
                                }
                            />
                        </div>

                        {counts.length === 0 ? (
                            <Empty description="No annotations found for this task." />
                        ) : filteredCounts.length === 0 ? (
                            <Empty description="No matching labels found." />
                        ) : (
                            <div style={{ height: 380 }}>
                                <Bar
                                    data={chartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: false },
                                            tooltip: {
                                                callbacks: {
                                                    label: (context) =>
                                                        ` Annotations: ${context.parsed.y}`,
                                                },
                                            },
                                        },
                                        scales: {
                                            x: {
                                                grid: { display: false },
                                            },
                                            y: {
                                                beginAtZero: true,
                                                ticks: { precision: 0 },
                                            },
                                        },
                                    }}
                                />
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}

export default React.memo(AnnotationCountsPage);
