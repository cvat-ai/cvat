import React, { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import Spin from 'antd/lib/spin';
import Alert from 'antd/lib/alert';
import Button from 'antd/lib/button';
import { LeftOutlined } from '@ant-design/icons';
import { Empty } from 'antd';
import Select from 'antd/lib/select';

const { Option } = Select;
type FilterType = 'total' | 'shapes' | 'tracks' | 'tags' | 'intervals';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend
);

interface RouteParams {
    tid: string;
}

export interface ClassStats {
    id: number;
    name: string;
    color: string;
    shapes: number;
    tracks: number;
    tags: number;
    intervals: number;
    total: number;
}

export interface TaskAnnotationStats {
    task_id: number;
    total_annotations: number;
    classes: ClassStats[];
}

export default function TaskClassAnalyticsPage(): JSX.Element {
    const { tid } = useParams<RouteParams>();
    const history = useHistory();
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<TaskAnnotationStats | null>(null);
    const [filterType, setFilterType] = useState<FilterType>('total');

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/test/tasks/${tid}/annotations/stats`);
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('You do not have permission to view this task.');
                }
                throw new Error(`Failed to fetch data: ${response.statusText}`);
            }
            const result: TaskAnnotationStats = await response.json();
            setData(result);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [tid]);

    return (
        <div style={{ padding: 24, width: '100%', height: '100%' }}>
            <Button
                type='link'
                onClick={() => history.push(`/tasks/${tid}`)}
                style={{ marginBottom: 16 }}
            >
                <LeftOutlined />
                Back to Task
            </Button>

            <Row justify="center" align="middle" style={{ minHeight: '60vh' }}>
                <Col span={20}>
                    {loading && (
                        <div style={{ textAlign: 'center' }}>
                            <Spin size="large" />
                            <Text style={{ display: 'block', marginTop: 16 }}>Loading analytics...</Text>
                        </div>
                    )}

                    {error && (
                        <Alert
                            message="Error Loading Analytics"
                            description={error}
                            type="error"
                            showIcon
                            action={
                                <Button size="small" danger onClick={fetchData}>
                                    Retry
                                </Button>
                            }
                        />
                    )}

                    {!loading && !error && data && data.total_annotations === 0 && (
                        <Empty 
                            description={
                                <span>
                                    No annotations found for this task.<br/>
                                    Start annotating to see class statistics!
                                </span>
                            }
                        />
                    )}

                    {!loading && !error && data && data.total_annotations > 0 && (
                        <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                                <Text strong style={{ marginRight: 8, alignSelf: 'center' }}>Filter by Type:</Text>
                                <Select value={filterType} onChange={setFilterType} style={{ width: 150 }}>
                                    <Option value="total">All Types</Option>
                                    <Option value="shapes">Shapes</Option>
                                    <Option value="tracks">Tracks</Option>
                                    <Option value="tags">Tags</Option>
                                    <Option value="intervals">Intervals</Option>
                                </Select>
                            </div>
                            <div style={{ height: '500px' }}>
                                <Bar
                                    data={{
                                        labels: data.classes.map(c => c.name),
                                        datasets: [
                                            {
                                                label: filterType.charAt(0).toUpperCase() + filterType.slice(1),
                                                data: data.classes.map(c => c[filterType]),
                                                backgroundColor: data.classes.map(c => c.color),
                                            borderColor: 'rgba(0, 0, 0, 0.1)',
                                            borderWidth: 1,
                                            borderRadius: 4,
                                        },
                                    ],
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            display: false,
                                        },
                                        title: {
                                            display: true,
                                            text: `Annotations per Class (Total: ${data.total_annotations})`,
                                            font: { size: 18 }
                                        },
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            ticks: {
                                                precision: 0
                                            }
                                        }
                                    }
                                }}
                            />
                            </div>
                        </div>
                    )}
                </Col>
            </Row>
        </div>
    );
}
