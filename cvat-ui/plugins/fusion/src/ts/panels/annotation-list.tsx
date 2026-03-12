// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useMemo } from 'react';
import Table from 'antd/lib/table';
import Tag from 'antd/lib/tag';
import { linkIdToColor, getLinkIdFromState } from '../utils/color';

interface Props {
    annotations2d: any[];
    annotations3d: any[];
    selectedLinkId: string | null;
    onSelectLinkId: (linkId: string | null) => void;
}

interface RowData {
    key: string;
    linkId: string | null;
    label2d: string;
    label3d: string;
    status: 'linked' | 'unlinked-2d' | 'unlinked-3d';
}

function buildRows(annotations2d: any[], annotations3d: any[]): RowData[] {
    const map2d = new Map<string, any>();
    const unlinked2d: any[] = [];

    annotations2d.forEach((s) => {
        const lid = getLinkIdFromState(s);
        if (lid) {
            map2d.set(lid, s);
        } else {
            unlinked2d.push(s);
        }
    });

    const map3d = new Map<string, any>();
    const unlinked3d: any[] = [];

    annotations3d.forEach((s) => {
        const lid = getLinkIdFromState(s);
        if (lid) {
            map3d.set(lid, s);
        } else {
            unlinked3d.push(s);
        }
    });

    const rows: RowData[] = [];

    // Linked pairs
    const allLinkIds = new Set([...map2d.keys(), ...map3d.keys()]);
    allLinkIds.forEach((lid) => {
        const s2d = map2d.get(lid);
        const s3d = map3d.get(lid);

        if (s2d && s3d) {
            rows.push({
                key: lid,
                linkId: lid,
                label2d: s2d.label?.name ?? '—',
                label3d: s3d.label?.name ?? '—',
                status: 'linked',
            });
        } else if (s2d) {
            rows.push({
                key: `2d-${lid}`,
                linkId: lid,
                label2d: s2d.label?.name ?? '—',
                label3d: '—',
                status: 'unlinked-2d',
            });
        } else if (s3d) {
            rows.push({
                key: `3d-${lid}`,
                linkId: lid,
                label3d: s3d.label?.name ?? '—',
                label2d: '—',
                status: 'unlinked-3d',
            });
        }
    });

    // Unlinked 2D (no link_id at all)
    unlinked2d.forEach((s, idx) => {
        rows.push({
            key: `u2d-${idx}`,
            linkId: null,
            label2d: s.label?.name ?? '—',
            label3d: '—',
            status: 'unlinked-2d',
        });
    });

    // Unlinked 3D
    unlinked3d.forEach((s, idx) => {
        rows.push({
            key: `u3d-${idx}`,
            linkId: null,
            label2d: '—',
            label3d: s.label?.name ?? '—',
            status: 'unlinked-3d',
        });
    });

    return rows;
}

const columns = [
    {
        title: '',
        dataIndex: 'linkId',
        key: 'color',
        width: 32,
        render: (linkId: string | null) => (
            <span
                style={{
                    display: 'inline-block',
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: linkIdToColor(linkId),
                }}
            />
        ),
    },
    {
        title: 'Link ID',
        dataIndex: 'linkId',
        key: 'linkId',
        width: 140,
        render: (val: string | null) => (val ? val.slice(0, 8) : '—'),
    },
    {
        title: '2D Label',
        dataIndex: 'label2d',
        key: 'label2d',
    },
    {
        title: '3D Label',
        dataIndex: 'label3d',
        key: 'label3d',
    },
    {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (status: string) => {
            const colorMap: Record<string, string> = {
                linked: 'green',
                'unlinked-2d': 'orange',
                'unlinked-3d': 'orange',
            };
            const labelMap: Record<string, string> = {
                linked: 'Linked',
                'unlinked-2d': 'Unlinked 2D',
                'unlinked-3d': 'Unlinked 3D',
            };
            return <Tag color={colorMap[status]}>{labelMap[status]}</Tag>;
        },
    },
];

function AnnotationList(props: Readonly<Props>): JSX.Element {
    const {
        annotations2d, annotations3d, selectedLinkId, onSelectLinkId,
    } = props;

    const rows = useMemo(() => buildRows(annotations2d, annotations3d), [annotations2d, annotations3d]);

    return (
        <div style={{ maxHeight: '30vh', overflow: 'auto', padding: '0 16px 16px' }}>
            <Table
                dataSource={rows}
                columns={columns}
                size='small'
                pagination={false}
                rowClassName={(record) => (record.linkId === selectedLinkId && selectedLinkId ? 'ant-table-row-selected' : '')}
                onRow={(record) => ({
                    onClick: () => onSelectLinkId(record.linkId),
                    style: { cursor: 'pointer' },
                })}
            />
        </div>
    );
}

export default React.memo(AnnotationList);
