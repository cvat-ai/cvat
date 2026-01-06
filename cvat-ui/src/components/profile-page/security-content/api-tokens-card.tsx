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
import Title from 'antd/lib/typography/Title';
import {
    MoreOutlined, PlusOutlined, QuestionCircleOutlined,
} from '@ant-design/icons';
import type { ColumnType } from 'antd/lib/table';

import { CombinedState } from 'reducers';
import { ApiToken, ApiTokenModifiableFields } from 'cvat-core-wrapper';
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

    const { apiTokens, fetching, tokenCount } = useSelector((state: CombinedState) => ({
        apiTokens: state.auth.apiTokens.current,
        fetching: state.auth.apiTokens.fetching,
        tokenCount: state.auth.apiTokens.count,
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
            title: '撤销 API 令牌',
            content: `确认要撤销令牌“${token.name}”吗？此操作无法撤销。`,
            okText: '撤销',
            okButtonProps: {
                type: 'primary',
                danger: true,
                className: 'cvat-api-token-revoke-button',
            },
            cancelText: '取消',
            onOk: () => {
                dispatch(revokeApiTokenAsync(token, () => {
                    dispatch(getApiTokensAsync());
                }));
            },
            className: 'cvat-modal-confirm-revoke-token',
        });
    }, [dispatch]);

    const onSubmitTokenForm = async (data: ApiTokenModifiableFields): Promise<void> => {
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
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            width: 250,
            sorter: (a: RowData, b: RowData) => a.name.localeCompare(b.name),
            className: 'cvat-api-token-name',
        },
        {
            title: '权限',
            dataIndex: 'readOnly',
            key: 'readOnly',
            align: 'center' as const,
            sorter: (a: RowData, b: RowData) => {
                if (a.readOnly === b.readOnly) return 0;
                return a.readOnly ? -1 : 1;
            },
            filters: [
                { text: '只读', value: true },
                { text: '读写', value: false },
            ],
            onFilter: (value: boolean | Key, record: RowData) => record.readOnly === value,
            render: (readOnly: boolean) => (
                <Tag color={readOnly ? 'blue' : 'orange'}>
                    {readOnly ? '只读' : '读写'}
                </Tag>
            ),
            className: 'cvat-api-token-permissions',
        },
        {
            title: '创建时间',
            dataIndex: 'createdDate',
            key: 'createdDate',
            sorter: (a: RowData, b: RowData) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime(),
            render: (date: string) => new Date(date).toLocaleDateString(),
            className: 'cvat-api-token-created-date',
        },
        {
            title: '过期时间',
            dataIndex: 'expiryDate',
            key: 'expiryDate',
            sorter: (a: RowData, b: RowData) => {
                if (!a.expiryDate && !b.expiryDate) return 0;
                if (!a.expiryDate) return 1;
                if (!b.expiryDate) return -1;
                return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
            },
            render: (date: string | null) => (
                date ? new Date(date).toLocaleDateString() : <Text underline>永不</Text>
            ),
            className: 'cvat-api-token-expire-date',
        },
        {
            title: '上次使用',
            dataIndex: 'lastUsedDate',
            key: 'lastUsedDate',
            sorter: (a: RowData, b: RowData) => {
                if (!a.lastUsedDate && !b.lastUsedDate) return 0;
                if (!a.lastUsedDate) return 1;
                if (!b.lastUsedDate) return -1;
                return new Date(a.lastUsedDate).getTime() - new Date(b.lastUsedDate).getTime();
            },
            render: (date: string | null) => (date ? new Date(date).toLocaleDateString() : '永不'),
            className: 'cvat-api-token-last-used',
        },
        {
            title: '操作',
            key: 'actions',
            align: 'center' as const,
            width: 60,
            render: (row: RowData) => (
                <Dropdown
                    menu={{
                        items: [
                            {
                                key: 'edit',
                                label: '编辑',
                                onClick: () => onEditToken(row.token),
                            },
                            { type: 'divider' },
                            {
                                key: 'revoke',
                                label: '撤销',
                                onClick: () => onRevokeToken(row.token),
                            },
                        ],
                    }}
                    className='cvat-api-token-actions-menu'
                    trigger={['click']}
                >
                    <Button type='text' icon={<MoreOutlined />} />
                </Dropdown>
            ),
        },
    ];

    return (
        <>
            <Card
                title={(
                    <Row className='cvat-security-api-tokens-card-title' justify='space-between'>
                        <Col>
                            <Title level={5}>个人访问令牌（PAT）</Title>
                            <CVATTooltip
                                title={(
                                    <Row className='cvat-api-tokens-tooltip-inner'>
                                        <Row>
                                            <Col>
                                                <Text>
                                                    个人访问令牌（PAT）是一段文本，可用于替代用户名/邮箱与密码进行认证。
                                                    你可以通过多种客户端与 CVAT Server API 交互，例如自定义脚本、CVAT Python SDK
                                                    以及 CVAT CLI。
                                                </Text>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Col>
                                                <Text>
                                                    为了增强安全性，每个令牌都可以设置过期时间并限制权限。用户可随时创建或撤销令牌。
                                                </Text>
                                            </Col>
                                        </Row>
                                    </Row>
                                )}
                                overlayStyle={{ maxWidth: 400 }}
                            >
                                <QuestionCircleOutlined style={{ opacity: 0.5 }} />
                            </CVATTooltip>
                        </Col>
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
                className='cvat-security-api-tokens-card'
            >
                {showCreateTokenForm ? (
                    <ApiTokenForm
                        onSubmit={onSubmitTokenForm}
                        onCancel={onCancelCreateTokenForm}
                        submitting={fetching}
                        token={editingToken}
                        tokenCount={tokenCount}
                    />
                ) : (
                    <CVATTable
                        tableTitle={<Title level={5}>现有令牌</Title>}
                        className='cvat-api-tokens-table'
                        csvExport={{ filename: 'access_tokens.csv' }}
                        columns={apiTokenColumns}
                        dataSource={tableData}
                        loading={fetching}
                        rowKey='key'
                        size='small'
                        pagination={{
                            showSizeChanger: true,
                            showQuickJumper: true,
                            defaultPageSize: 10,
                            pageSizeOptions: ['10', '20', '50'],
                        }}
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

