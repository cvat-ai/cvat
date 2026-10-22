// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import Badge from 'antd/lib/badge';
import Button from 'antd/lib/button';
import Collapse from 'antd/lib/collapse';
import Descriptions from 'antd/lib/descriptions';
import Drawer from 'antd/lib/drawer';
import List from 'antd/lib/list';
import notification from 'antd/lib/notification';
import { CopyOutlined, DeleteOutlined } from '@ant-design/icons';

import {
    CSPViolationRecord,
    clearCSPViolation,
    clearCSPViolations,
    getCSPViolations,
    subscribeToCSPViolations,
} from 'utils/csp/csp-violation-observer';
import { toClipboard } from 'utils/to-clipboard';
import './styles.scss';

function renderLocation(violation: CSPViolationRecord): string | null {
    if (!violation.sourceFile) {
        return null;
    }

    if (!violation.lineNumber) {
        return violation.sourceFile;
    }

    return `${violation.sourceFile}:${violation.lineNumber}:${violation.columnNumber}`;
}

function renderValue(value: string | number | null): JSX.Element {
    return <code>{value === null || value === '' ? '—' : value}</code>;
}

interface CopyDetailsButtonProps {
    content: string;
    label: string;
}

function CopyDetailsButton({ content, label }: CopyDetailsButtonProps): JSX.Element {
    const onCopy = async (): Promise<void> => {
        const copied = await toClipboard(content);

        if (copied) {
            notification.success({ message: 'CSP violation details copied' });
        }
    };

    return (
        <Button
            icon={<CopyOutlined />}
            size='small'
            onClick={(event) => {
                event.stopPropagation();
                onCopy();
            }}
        >
            {label}
        </Button>
    );
}

interface ClearButtonProps {
    label: string;
    onClear: () => void;
}

function ClearButton({ label, onClear }: ClearButtonProps): JSX.Element {
    return (
        <Button
            icon={<DeleteOutlined />}
            size='small'
            onClick={(event) => {
                event.stopPropagation();
                onClear();
            }}
        >
            {label}
        </Button>
    );
}

function renderViolation(violation: CSPViolationRecord): JSX.Element {
    const directive = violation.effectiveDirective || violation.violatedDirective;
    const location = renderLocation(violation);

    return (
        <Collapse
            className='cvat-csp-violation-overlay-item'
            items={[{
                key: 'details',
                label: (
                    <Descriptions column={1} size='small'>
                        <Descriptions.Item label='Directive'>
                            <span className='cvat-csp-violation-overlay-item-directive'>
                                {directive}
                                <span className='cvat-csp-violation-overlay-item-actions'>
                                    <CopyDetailsButton content={JSON.stringify(violation, null, 2)} label='Copy' />
                                    <ClearButton label='Clear' onClear={() => clearCSPViolation(violation)} />
                                </span>
                            </span>
                        </Descriptions.Item>
                        <Descriptions.Item
                            className='cvat-csp-violation-overlay-item-blocked-resource'
                            label='Blocked resource'
                        >
                            {/* eslint-disable-next-line
                                jsx-a11y/click-events-have-key-events,
                                jsx-a11y/no-static-element-interactions */}
                            <span
                                className='cvat-csp-violation-overlay-item-blocked-resource-value'
                                onClick={(event) => event.stopPropagation()}
                            >
                                {renderValue(violation.blockedURI)}
                            </span>
                        </Descriptions.Item>
                    </Descriptions>
                ),
                children: (
                    <Descriptions column={1} size='small'>
                        <Descriptions.Item label='Context'>
                            {renderValue(violation.context)}
                        </Descriptions.Item>
                        <Descriptions.Item label='Effective directive'>
                            {renderValue(violation.effectiveDirective)}
                        </Descriptions.Item>
                        <Descriptions.Item label='Violated directive'>
                            {renderValue(violation.violatedDirective)}
                        </Descriptions.Item>
                        <Descriptions.Item label='Disposition'>
                            {renderValue(violation.disposition)}
                        </Descriptions.Item>
                        <Descriptions.Item label='Occurrences'>
                            {renderValue(violation.count)}
                        </Descriptions.Item>
                        <Descriptions.Item label='Location'>
                            {renderValue(location)}
                        </Descriptions.Item>
                    </Descriptions>
                ),
            }]}
        />
    );
}

export default function CSPViolationOverlay(): JSX.Element | null {
    const violations = useSyncExternalStore(subscribeToCSPViolations, getCSPViolations);
    const [open, setOpen] = useState(true);

    useEffect(() => {
        if (violations.length > 0) {
            setOpen(true);
        }
    }, [violations]);

    if (!violations.length) {
        return null;
    }

    return (
        <>
            <div className='cvat-csp-violation-overlay-widget'>
                <Badge count={violations.length} size='small'>
                    <Button danger type='primary' onClick={() => setOpen((value) => !value)}>
                        CSP violations
                    </Button>
                </Badge>
            </div>
            <Drawer
                className='cvat-csp-violation-overlay-drawer'
                open={open}
                zIndex={10000}
                title={(
                    <div className='cvat-csp-violation-overlay-drawer-title'>
                        <span>Content Security Policy: violations list</span>
                        <span className='cvat-csp-violation-overlay-drawer-actions'>
                            <CopyDetailsButton content={JSON.stringify(violations, null, 2)} label='Copy all' />
                            <ClearButton label='Clear all' onClear={clearCSPViolations} />
                        </span>
                    </div>
                )}
                width={480}
                onClose={() => setOpen(false)}
            >
                <List
                    dataSource={[...violations].reverse()}
                    renderItem={(violation: CSPViolationRecord) => <List.Item>{renderViolation(violation)}</List.Item>}
                />
            </Drawer>
        </>
    );
}
