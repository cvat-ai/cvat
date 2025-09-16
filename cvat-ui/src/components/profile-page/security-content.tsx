// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';

import { Col, Row } from 'antd/lib/grid';
import Card from 'antd/lib/card';
import Typography from 'antd/lib/typography';
import Button from 'antd/lib/button';
import Tag from 'antd/lib/tag';
import Dropdown from 'antd/lib/dropdown';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons';

import { CombinedState, ChangePasswordData } from 'reducers';
import { changePasswordAsync, createApiTokenAsync } from 'actions/auth-actions';
import CVATTable from 'components/common/cvat-table';
import ChangePasswordForm from './change-password-form';
import CreateApiTokenForm from './api-token-form';

interface Props {
    isPasswordChangeEnabled: boolean;
}

function SecurityContent({ isPasswordChangeEnabled }: Props): JSX.Element {
    const dispatch = useDispatch();
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [showCreateTokenForm, setShowCreateTokenForm] = useState(false);

    const { apiTokens, fetching } = useSelector((state: CombinedState) => ({
        apiTokens: state.auth.apiTokens.current,
        fetching: state.auth.apiTokens.fetching,
    }), shallowEqual);

    const onShowPasswordForm = useCallback((): void => {
        setShowPasswordForm(true);
    }, []);

    const onCancelPasswordForm = useCallback((): void => {
        setShowPasswordForm(false);
    }, []);

    const onShowCreateTokenForm = useCallback((): void => {
        setShowCreateTokenForm(true);
    }, []);

    const onCancelCreateTokenForm = useCallback((): void => {
        setShowCreateTokenForm(false);
    }, []);

    const onChangePassword = (data: ChangePasswordData): void => {
        dispatch(changePasswordAsync(data, onCancelPasswordForm));
    };

    const onCreateApiToken = (data: { label: string; expirationDate: string | null; readOnly: boolean }): void => {
        dispatch(createApiTokenAsync({
            name: data.label,
            expiry_date: data.expirationDate,
            read_only: data.readOnly,
        }));
        onCancelCreateTokenForm();
    };

    const apiTokenColumns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a: any, b: any) => a.name.localeCompare(b.name),
        },
        {
            title: 'Permissions',
            dataIndex: 'readOnly',
            key: 'readOnly',
            align: 'center' as const,
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
            sorter: (a: any, b: any) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime(),
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
        {
            title: 'Expires',
            dataIndex: 'expiryDate',
            key: 'expiryDate',
            sorter: (a: any, b: any) => {
                if (!a.expiryDate && !b.expiryDate) return 0;
                if (!a.expiryDate) return 1;
                if (!b.expiryDate) return -1;
                return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
            },
            render: (date: string) => (date ? new Date(date).toLocaleDateString() : 'Never'),
        },
        {
            title: 'Last Used',
            dataIndex: 'lastUsedDate',
            key: 'lastUsedDate',
            sorter: (a: any, b: any) => {
                if (!a.lastUsedDate && !b.lastUsedDate) return 0;
                if (!a.lastUsedDate) return 1;
                if (!b.lastUsedDate) return -1;
                return new Date(a.lastUsedDate).getTime() - new Date(b.lastUsedDate).getTime();
            },
            render: (date: string) => (date ? new Date(date).toLocaleDateString() : 'Never'),
        },
        {
            title: 'Actions',
            key: 'actions',
            align: 'center' as const,
            width: 80,
            render: () => (
                <Dropdown
                    disabled
                    menu={{
                        items: [
                            { key: 'edit', label: 'Edit' },
                            { key: 'delete', label: 'Delete', danger: true },
                        ],
                    }}
                    trigger={['click']}
                >
                    <Button type='text' icon={<EllipsisOutlined />} />
                </Dropdown>
            ),
        },
    ];

    return (
        <div className='cvat-security-content'>
            {isPasswordChangeEnabled && (
                <Card
                    title='Password'
                    className='cvat-security-password-card'
                    style={{ marginBottom: 16 }}
                >
                    {showPasswordForm ? (
                        <ChangePasswordForm onSubmit={onChangePassword} onCancel={onCancelPasswordForm} />
                    ) :
                        (
                            <Row justify='space-between' align='middle'>
                                <Col>
                                    <Typography.Text type='secondary'>
                                        Keep your account secure with a strong, unique password
                                    </Typography.Text>
                                </Col>
                                <Col>
                                    <Button className='cvat-security-password-change-button' onClick={onShowPasswordForm} type='primary'>
                                        Change password
                                    </Button>
                                </Col>
                            </Row>
                        )}
                </Card>
            )}
            <Card
                className='cvat-security-api-tokens-card'
            >
                {showCreateTokenForm ? (
                    <CreateApiTokenForm
                        onSubmit={onCreateApiToken}
                        onCancel={onCancelCreateTokenForm}
                        submitting={fetching}
                    />
                ) : (
                    <CVATTable
                        tableTitle='API Tokens'
                        className='cvat-api-tokens-table'
                        columns={apiTokenColumns}
                        dataSource={apiTokens}
                        loading={fetching}
                        rowKey='id'
                        size='small'
                        pagination={{
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total: number, range: number[]) => (
                                `${range[0]}-${range[1]} of ${total} tokens`
                            ),
                            defaultPageSize: 10,
                            pageSizeOptions: ['10', '20', '50'],
                        }}
                        renderExtraActions={() => (
                            <Button
                                type='primary'
                                icon={<PlusOutlined />}
                                onClick={onShowCreateTokenForm}
                                className='cvat-create-api-token-button'
                            >
                                Create Token
                            </Button>
                        )}
                    />
                )}
            </Card>
        </div>
    );
}

export default React.memo(SecurityContent);
