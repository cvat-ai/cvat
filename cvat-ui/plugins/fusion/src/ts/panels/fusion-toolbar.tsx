// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Button from 'antd/lib/button';
import Select from 'antd/lib/select';
import Tooltip from 'antd/lib/tooltip';
import Space from 'antd/lib/space';
import Divider from 'antd/lib/divider';
import {
    SelectOutlined,
    BorderOutlined,
    CodeSandboxOutlined,
    SaveOutlined,
} from '@ant-design/icons';

interface FusionToolbarProps {
    labels: any[];
    activeControl: 'select' | 'draw2d' | 'draw3d';
    selectedLabel: any | null;
    onStartDraw2d: (label: any) => void;
    onStartDraw3d: (label: any) => void;
    onCancelDraw: () => void;
    onSave: () => void;
    onLabelChange: (label: any) => void;
    saving?: boolean;
}

function FusionToolbar(props: FusionToolbarProps): JSX.Element {
    const {
        labels,
        activeControl,
        selectedLabel,
        onStartDraw2d,
        onStartDraw3d,
        onCancelDraw,
        onSave,
        onLabelChange,
        saving = false,
    } = props;

    const hasLabels = labels.length > 0;
    const canDraw = hasLabels && selectedLabel !== null;

    const handleLabelChange = (labelId: number): void => {
        const label = labels.find((l: any) => l.id === labelId) || null;
        if (label) {
            onLabelChange(label);
        }
    };

    React.useEffect(() => {
        if (labels.length === 1 && !selectedLabel) {
            onLabelChange(labels[0]);
        }
    }, [labels, selectedLabel]);

    return (
        <div
            style={{
                padding: '6px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: '#fafafa',
                borderBottom: '1px solid #e8e8e8',
            }}
        >
            <Space>
                <Tooltip title='Select (Esc)'>
                    <Button
                        type={activeControl === 'select' ? 'primary' : 'default'}
                        icon={<SelectOutlined />}
                        onClick={onCancelDraw}
                    >
                        Select
                    </Button>
                </Tooltip>
                <Tooltip title='Draw Rectangle (N)'>
                    <Button
                        type={activeControl === 'draw2d' ? 'primary' : 'default'}
                        icon={<BorderOutlined />}
                        disabled={!canDraw}
                        onClick={() => selectedLabel && onStartDraw2d(selectedLabel)}
                    >
                        Draw Rect
                    </Button>
                </Tooltip>
                <Tooltip title='Draw Cuboid (M)'>
                    <Button
                        type={activeControl === 'draw3d' ? 'primary' : 'default'}
                        icon={<CodeSandboxOutlined />}
                        disabled={!canDraw}
                        onClick={() => selectedLabel && onStartDraw3d(selectedLabel)}
                    >
                        Draw Cuboid
                    </Button>
                </Tooltip>
            </Space>

            <Divider type='vertical' style={{ height: '28px' }} />

            <Space>
                <span>Label:</span>
                <Select
                    style={{ minWidth: 160 }}
                    placeholder='Select label'
                    value={selectedLabel?.id ?? undefined}
                    onChange={handleLabelChange}
                    disabled={!hasLabels}
                >
                    {labels.map((label: any) => (
                        <Select.Option key={label.id} value={label.id}>
                            <span
                                style={{
                                    display: 'inline-block',
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    backgroundColor: label.color,
                                    marginRight: 6,
                                    verticalAlign: 'middle',
                                }}
                            />
                            {label.name}
                        </Select.Option>
                    ))}
                </Select>
            </Space>

            <Divider type='vertical' style={{ height: '28px' }} />

            <Tooltip title='Save (Ctrl+S)'>
                <Button
                    type='primary'
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={onSave}
                >
                    Save
                </Button>
            </Tooltip>
        </div>
    );
}

export default React.memo(FusionToolbar);
