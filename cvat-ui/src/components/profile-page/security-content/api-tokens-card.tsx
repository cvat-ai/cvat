// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import type { Key } from 'react';

import { Col, Row } from 'antd/lib/grid';
import Card from 'antd/lib/card';
import Button from 'antd/lib/button';
import Tag from 'antd/lib/tag';
import Dropdown from 'antd/lib/dropdown';
import Modal from 'antd/lib/modal';
import Text from 'antd/lib/typography/Text';
import {
    MoreOutlined, PlusOutlined, QuestionCircleOutlined,
} from '@ant-design/icons';
import type { ColumnType } from 'antd/lib/table';

import { CombinedState } from 'reducers';
import { ApiToken, ApiTokenSaveFields } from 'cvat-core-wrapper';
import {
    createApiTokenAsync, getApiTokensAsync,
    updateApiTokenAsync, revokeApiTokenAsync,
} from 'actions/auth-actions';
import CVATTable from 'components/common/cvat-table';
import CVATTooltip from 'components/common/cvat-tooltip';
import ApiTokenForm from './api-token-form';
import ApiTokenCreatedModal from './api-token-created-modal';

interface RowData {
    key: number;
    name: string;
    readOnly: boolean;
    createdDate: string;
    expiryDate: string | null;
    lastUsedDate: string | null;
    token: ApiToken;
}

function ApiTokensCard(): JSX.Element {
    const dispatch = useDispatch();
    const [showCreateTokenForm, setShowCreateTokenForm] = useState(false);
    const [showTokenModal, setShowTokenModal] = useState(false);
    const [newToken, setNewToken] = useState<ApiToken | null>(null);
    const [editingToken, setEditingToken] = useState<ApiToken | null>(null);

    const { apiTokens, fetching } = useSelector((state: CombinedState) => ({
        apiTokens: state.auth.apiTokens.current,
        fetching: state.auth.apiTokens.fetching,
    }), shallowEqual);

    const tableData: RowData[] = apiTokens.map((token: ApiToken) => ({
        key: token.id,
        name: token.name,
        readOnly: token.readOnly,
        createdDate: token.createdDate,
        expiryDate: token.expiryDate,
        lastUsedDate: token.lastUsedDate,
        token,
    }));

    useEffect(() => {
        dispatch(getApiTokensAsync());
    }, [dispatch]);

    const onShowCreateTokenForm = useCallback((): void => {
        setShowCreateTokenForm(true);
    }, []);

    const onCancelCreateTokenForm = useCallback((): void => {
        setShowCreateTokenForm(false);
        setEditingToken(null);
    }, []);

    const onEditToken = useCallback((token: ApiToken): void => {
        setEditingToken(token);
        setShowCreateTokenForm(true);
    }, []);

    const onRevokeToken = useCallback((token: ApiToken): void => {
        Modal.confirm({
            title: 'Revoke API Token',
            content: `Are you sure you want to revoke the token "${token.name}"? This action cannot be undone.`,
            okText: 'Revoke',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: () => {
                dispatch(revokeApiTokenAsync(token.id, () => {
                    dispatch(getApiTokensAsync());
                }));
            },
        });
    }, [dispatch]);

    const onSubmitTokenForm = async (data: ApiTokenSaveFields): Promise<void> => {
        if (editingToken) {
            dispatch(updateApiTokenAsync(editingToken, data, () => {
                setShowCreateTokenForm(false);
                setEditingToken(null);
                dispatch(getApiTokensAsync());
            }));
        } else {
            dispatch(createApiTokenAsync(data, (token) => {
                if (token.value) {
                    setNewToken(token);
                    setShowTokenModal(true);
                }

                setShowCreateTokenForm(false);
                dispatch(getApiTokensAsync());
            }));
        }
    };

    const onCloseTokenModal = useCallback((): void => {
        setShowTokenModal(false);
        setNewToken(null);
    }, []);

    const apiTokenColumns: ColumnType<RowData>[] = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            width: 250,
            sorter: (a: RowData, b: RowData) => a.name.localeCompare(b.name),
        },
        {
            title: 'Permissions',
            dataIndex: 'readOnly',
            key: 'readOnly',
            align: 'center' as const,
            sorter: (a: RowData, b: RowData) => {
                if (a.readOnly === b.readOnly) return 0;
                return a.readOnly ? -1 : 1;
            },
            filters: [
                { text: 'Read Only', value: true },
                { text: 'Read/Write', value: false },
            ],
            onFilter: (value: boolean | Key, record: RowData) => record.readOnly === value,
            render: (readOnly: boolean) => (
                <Tag color={readOnly ? 'blue' : 'green'}>
                    {readOnly ? 'Read Only' : 'Read/Write'}
                </Tag>
            ),
        },
        {
            title: 'Created',
            dataIndex: 'createdDate',
            key: 'createdDate',
            sorter: (a: RowData, b: RowData) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime(),
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
        {
            title: 'Expires',
            dataIndex: 'expiryDate',
            key: 'expiryDate',
            sorter: (a: RowData, b: RowData) => {
                if (!a.expiryDate && !b.expiryDate) return 0;
                if (!a.expiryDate) return 1;
                if (!b.expiryDate) return -1;
                return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
            },
            render: (date: string | null) => (date ? new Date(date).toLocaleDateString() : 'Never'),
        },
        {
            title: 'Last Used',
            dataIndex: 'lastUsedDate',
            key: 'lastUsedDate',
            sorter: (a: RowData, b: RowData) => {
                if (!a.lastUsedDate && !b.lastUsedDate) return 0;
                if (!a.lastUsedDate) return 1;
                if (!b.lastUsedDate) return -1;
                return new Date(a.lastUsedDate).getTime() - new Date(b.lastUsedDate).getTime();
            },
            render: (date: string | null) => (date ? new Date(date).toLocaleDateString() : 'Never'),
        },
        {
            title: 'Actions',
            key: 'actions',
            align: 'center' as const,
            width: 60,
            render: (row: RowData) => (
                <Dropdown
                    menu={{
                        items: [
                            {
                                key: 'edit',
                                label: 'Edit',
                                onClick: () => onEditToken(row.token),
                            },
                            { type: 'divider' },
                            {
                                key: 'revoke',
                                label: 'Revoke',
                                onClick: () => onRevokeToken(row.token),
                            },
                        ],
                    }}
                    trigger={['click']}
                >
                    <Button type='text' icon={<MoreOutlined />} />
                </Dropdown>
            ),
        },
    ];

    return (
        <>
            <Card className='cvat-security-api-tokens-card'>
                {showCreateTokenForm ? (
                    <ApiTokenForm
                        onSubmit={onSubmitTokenForm}
                        onCancel={onCancelCreateTokenForm}
                        submitting={fetching}
                        token={editingToken}
                    />
                ) : (
                    <CVATTable
                        tableTitle={(
                            <>
                                <Text strong>Personal Access Tokens (PATs)</Text>
                                <CVATTooltip
                                    title={(
                                        <Row className='cvat-api-tokens-tooltip-inner'>
                                            <Row>
                                                <Col>
                                                    <Text>
                                                        Personal Access Tokens allow you to authenticate with the API
                                                        without using your username and password.
                                                    </Text>
                                                </Col>
                                            </Row>
                                            <Row>
                                                <Col>
                                                    <Text>
                                                        Read Only tokens can only view data, while
                                                        Read/Write tokens can modify data.
                                                    </Text>
                                                </Col>
                                            </Row>
                                            <Row>
                                                <Col>
                                                    <Text>
                                                        Store your tokens securely and never share them.
                                                        If a token is compromised, revoke it immediately.
                                                    </Text>
                                                </Col>
                                            </Row>
                                        </Row>
                                    )}
                                    overlayStyle={{ maxWidth: 400 }}
                                >
                                    <QuestionCircleOutlined style={{ opacity: 0.5 }} />
                                </CVATTooltip>
                            </>
                        )}
                        className='cvat-api-tokens-table'
                        csvExport={{ filename: 'api_tokens.csv' }}
                        columns={apiTokenColumns}
                        dataSource={tableData}
                        loading={fetching}
                        rowKey='id'
                        size='small'
                        pagination={{
                            showSizeChanger: true,
                            showQuickJumper: true,
                            defaultPageSize: 10,
                            pageSizeOptions: ['10', '20', '50'],
                        }}
                        renderExtraActions={() => (
                            <Row justify='end'>
                                <Col>
                                    <Button
                                        type='primary'
                                        icon={<PlusOutlined />}
                                        onClick={onShowCreateTokenForm}
                                        className='cvat-create-api-token-button'
                                    />
                                </Col>
                            </Row>
                        )}
                    />
                )}
            </Card>
            {newToken && (
                <ApiTokenCreatedModal
                    visible={showTokenModal}
                    token={newToken}
                    onClose={onCloseTokenModal}
                />
            )}
        </>
    );
}

export default React.memo(ApiTokensCard);
