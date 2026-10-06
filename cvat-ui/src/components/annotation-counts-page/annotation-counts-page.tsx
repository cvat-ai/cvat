// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import Button from 'antd/lib/button';
import Empty from 'antd/lib/empty';
import Result from 'antd/lib/result';
import Switch from 'antd/lib/switch';

import { Task, getCore } from 'cvat-core-wrapper';
import { fetchTask } from 'utils/fetch';
import GoBackButton from 'components/common/go-back-button';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import ResourceLink from 'components/common/resource-link';
import AnnotationCountsChart, { LabelCount } from './annotation-counts-chart';

const core = getCore();

interface AnnotationCounts {
    task_id: number;
    total: number;
    labels: LabelCount[];
}

async function fetchAnnotationCounts(taskId: number, byShapeType: boolean): Promise<AnnotationCounts> {
    const response = await core.server.request<{ data: AnnotationCounts }>(
        `${core.config.backendAPI}/test/tasks/${taskId}/annotation-counts`,
        { method: 'GET', params: byShapeType ? { group_by: 'shape_type' } : {} },
    );
    return response.data;
}

interface ContentProps {
    counts: AnnotationCounts;
    byShapeType: boolean;
    onByShapeTypeChange: (byShapeType: boolean) => void;
}

function AnnotationCountsContent({ counts, byShapeType, onByShapeTypeChange }: ContentProps): JSX.Element {
    if (counts.total === 0) {
        return (
            <Empty
                className='cvat-annotation-counts-empty'
                description='This task has no annotations yet'
            />
        );
    }

    const usedLabels = counts.labels.filter((label) => label.count > 0);
    const unusedLabels = counts.labels.filter((label) => label.count === 0);

    return (
        <>
            <Text className='cvat-annotation-counts-summary'>
                {`${counts.total} annotations in ${usedLabels.length} of ${counts.labels.length} labels`}
            </Text>
            <label className='cvat-annotation-counts-shape-type-switch'>
                <Switch size='small' checked={byShapeType} onChange={onByShapeTypeChange} />
                <Text>Split by shape type</Text>
            </label>
            <AnnotationCountsChart labels={usedLabels} byShapeType={byShapeType} />
            {unusedLabels.length > 0 && (
                <Text type='secondary' className='cvat-annotation-counts-unused'>
                    {`No annotations yet: ${unusedLabels.map((label) => label.name).join(', ')}`}
                </Text>
            )}
        </>
    );
}

function AnnotationCountsPage(): JSX.Element {
    const taskId = +useParams<{ tid: string }>().tid;
    const [task, setTask] = useState<Task | null>(null);
    const [counts, setCounts] = useState<AnnotationCounts | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [fetching, setFetching] = useState(true);
    const [byShapeType, setByShapeType] = useState(false);

    const load = useCallback(async (): Promise<void> => {
        setFetching(true);
        setError(null);
        try {
            const [receivedTask, receivedCounts] = await Promise.all([
                fetchTask(taskId),
                fetchAnnotationCounts(taskId, byShapeType),
            ]);
            setTask(receivedTask);
            setCounts(receivedCounts);
        } catch (receivedError: unknown) {
            setError(receivedError instanceof Error ? receivedError : new Error('Unknown error'));
        } finally {
            setFetching(false);
        }
    }, [taskId, byShapeType]);

    useEffect(() => {
        load();
    }, [load]);

    let content: JSX.Element | null = null;
    if (fetching) {
        content = <CVATLoadingSpinner />;
    } else if (error) {
        content = (
            <Result
                className='cvat-annotation-counts-error'
                status='error'
                title='Could not load the annotation counts'
                subTitle={error.message}
                extra={<Button type='primary' onClick={load}>Try again</Button>}
            />
        );
    } else if (counts) {
        content = (
            <AnnotationCountsContent
                counts={counts}
                byShapeType={byShapeType}
                onByShapeTypeChange={setByShapeType}
            />
        );
    }

    return (
        <div className='cvat-annotation-counts-page'>
            <Row justify='center'>
                <Col span={22} xl={18} xxl={14}>
                    <GoBackButton />
                    <Title level={4} className='cvat-text-color cvat-annotation-counts-title'>
                        {'Annotation counts'}
                        {task && (
                            <>
                                {' for '}
                                <ResourceLink resource={task} />
                            </>
                        )}
                    </Title>
                    {content}
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(AnnotationCountsPage);
