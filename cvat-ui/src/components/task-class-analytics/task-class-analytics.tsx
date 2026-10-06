import React, { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import Spin from 'antd/lib/spin';
import Alert from 'antd/lib/alert';
import Button from 'antd/lib/button';
import { LeftOutlined } from '@ant-design/icons';

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
                <Col span={16}>
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

                    {!loading && !error && data && (
                        <div style={{ textAlign: 'center' }}>
                            <Text strong style={{ fontSize: 24 }}>Data fetched successfully!</Text>
                            <br />
                            <Text>Total annotations: {data.total_annotations}</Text>
                            {/* Chart will go here in Step 3 */}
                        </div>
                    )}
                </Col>
            </Row>
        </div>
    );
}
