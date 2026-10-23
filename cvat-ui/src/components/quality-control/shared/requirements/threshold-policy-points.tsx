// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useEffect, useId, useRef, useState,
} from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import CVATTable from 'components/common/cvat-table';
import { MAX_THRESHOLD_POINTS } from 'cvat-core/src/quality/threshold-policy';
import { EditableThresholdPoint } from './threshold-policy-editor-types';
import ThresholdPolicyInput, {
    formatThresholdCoordinate, thresholdPercent, thresholdValueError,
} from './threshold-policy-input';

interface Props {
    points: EditableThresholdPoint[];
    selected: number | null;
    reveal: { id: number } | null;
    disabled: boolean;
    valid: boolean;
    onSelect: (id: number) => void;
    onUpdate: (id: number, field: 'x' | 'y', value: number | null) => void;
    onCommit: () => void;
    onDelete: (id: number) => void;
    onAdd: () => void;
}

const PAGE_SIZE = 10;

export default function ThresholdPolicyPoints(props: Readonly<Props>): JSX.Element {
    const {
        points, selected, reveal, disabled, valid, onSelect, onUpdate, onCommit, onDelete, onAdd,
    } = props;
    const controlID = useId();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState<number | null>(null);
    const revealed = useRef(reveal);

    useEffect(() => {
        if (reveal === revealed.current) return;
        revealed.current = reveal;
        if (reveal) {
            const index = points.findIndex((point) => point.id === reveal.id);
            if (index !== -1) {
                setSearch('');
                setPage(Math.floor(index / PAGE_SIZE) + 1);
            }
        }
    }, [reveal, points]);

    const data = points.map((point, index) => {
        let areaError = '';
        if (!Number.isFinite(point.x) || point.x <= 0) areaError = 'GT area must be finite and positive.';
        else if (points.some((other) => other.id !== point.id && other.x === point.x)) {
            areaError = 'GT area must be unique.';
        }
        return {
            ...point, index, areaError, iouError: thresholdValueError(point.y),
        };
    }).filter((point) => (
        point.id === editing || point.areaError || point.iouError ||
        [point.index + 1, formatThresholdCoordinate(point.x), formatThresholdCoordinate(thresholdPercent(point.y))]
            .join(' ').toLowerCase().includes(search.toLowerCase())
    ));
    const currentPage = Math.min(page, Math.max(1, Math.ceil(data.length / PAGE_SIZE)));
    const focus = (id: number): void => { setEditing(id); onSelect(id); };
    const commit = (): void => { setEditing(null); onCommit(); };

    return (
        <>
            <CVATTable
                className='cvat-threshold-policy-points'
                tableTitle={`Key points (${points.length})`}
                size='small'
                rowKey='id'
                dataSource={data}
                pagination={{
                    current: currentPage,
                    pageSize: PAGE_SIZE,
                    showSizeChanger: false,
                    hideOnSinglePage: true,
                    onChange: setPage,
                }}
                rowClassName={(point: EditableThresholdPoint) => (
                    `cvat-threshold-policy-row${selected === point.id ? ' selected' : ''}`
                )}
                renderExtraActions={() => (
                    <Input.Search className='cvat-table-search-bar'
                        aria-label='Search key points' placeholder='Search points' value={search}
                        allowClear enterButton onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
                )}
                renderHeaderActions={() => (
                    <Button type='primary' aria-label='Add point'
                        disabled={disabled || !valid || points.length >= MAX_THRESHOLD_POINTS}
                        icon={<PlusOutlined />} onClick={onAdd} />
                )}
                columns={[{
                    title: '#',
                    width: 48,
                    render: (_, point: typeof data[number]) => point.index + 1,
                }, {
                    title: 'GT area (px²)',
                    render: (_, point: typeof data[number]) => (
                        <ThresholdPolicyInput id={`${controlID}-area-${point.id}`}
                            label={`GT area for point ${point.index + 1}`} value={point.x}
                            error={point.areaError} disabled={disabled} onFocus={() => focus(point.id)}
                            onChange={(number) => onUpdate(point.id, 'x', number)} onCommit={commit} />
                    ),
                }, {
                    title: 'IoU (%)',
                    render: (_, point: typeof data[number]) => (
                        <ThresholdPolicyInput id={`${controlID}-iou-${point.id}`} percentage
                            label={`IoU for point ${point.index + 1}`} value={point.y}
                            error={point.iouError} disabled={disabled} onFocus={() => focus(point.id)}
                            onChange={(number) => onUpdate(point.id, 'y', number)} onCommit={commit} />
                    ),
                }, {
                    title: 'Actions',
                    width: 80,
                    render: (_, point: typeof data[number]) => (
                        <Button icon={<DeleteOutlined />} aria-label={`Delete point ${point.index + 1}`}
                            disabled={disabled || points.length <= 2} onClick={() => onDelete(point.id)} />
                    ),
                }]}
            />
            <p className='cvat-threshold-policy-hint'>
                Linear interpolation between 2–200 points. Outside their range, the nearest endpoint is used.
            </p>
        </>
    );
}
