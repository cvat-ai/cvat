// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useState, useRef, useEffect, useCallback,
} from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import dayjs from 'dayjs';
import _ from 'lodash';
import { Row, Col } from 'antd/lib/grid';
import Form from 'antd/lib/form';
import Text from 'antd/lib/typography/Text';
import Modal from 'antd/lib/modal';
import Button from 'antd/lib/button';
import Space from 'antd/lib/space';
import Input from 'antd/lib/input';
import Dropdown from 'antd/lib/dropdown';
import { Store } from 'antd/lib/form/interface';
import {
    EditTwoTone, EnvironmentOutlined,
    MailOutlined, PhoneOutlined, PlusCircleOutlined, MoreOutlined,
} from '@ant-design/icons';

import {
    inviteOrganizationMembersAsync,
    leaveOrganizationAsync,
    removeOrganizationAsync,
    updateOrganizationAsync,
} from 'actions/organization-actions';
import { OrganizationMembersQuery } from 'reducers';
import { Organization, User } from 'cvat-core-wrapper';
import {
    SortingComponent,
    ResourceFilterHOC,
    defaultVisibility,
    ResourceSelectionInfo,
} from 'components/resource-sorting-filtering';

import InvitationModal from './invitation-modal';

import {
    localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues, config,
} from './memberships-filter-configuration';

export interface Props {
    organizationInstance: Organization;
    userInstance: User;
    query: OrganizationMembersQuery;
    fetchMembers: () => void;
    onApplySearch: (search: string | null) => void;
    onApplyFilter: (filter: string | null) => void;
    onApplySorting: (sort: string | null) => void;
    selectedCount: number;
    onSelectAll: () => void;
}

export enum MenuActions {
    SET_WEBHOOKS = 'SET_WEBHOOKS',
    REMOVE_ORGANIZATION = 'REMOVE_ORGANIZATION',
}

const FilteringComponent = ResourceFilterHOC(
    config, localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues,
);

function OrganizationTopBar(props: Readonly<Props>): JSX.Element {
    const {
        organizationInstance, userInstance, fetchMembers, query,
        onApplyFilter, onApplySearch, onApplySorting, selectedCount, onSelectAll,
    } = props;
    const {
        owner, createdDate, description, updatedDate, slug, name, contact,
    } = organizationInstance;
    const { id: userID } = userInstance;
    const descriptionEditingRef = useRef<HTMLDivElement>(null);
    const editingRef = useRef({ name, contact });
    const [editingDescription, setEditingDescription] = useState(false);
    const [visibleInviteModal, setVisibleInviteModal] = useState(false);
    const [visibility, setVisibility] = useState(defaultVisibility);
    const dispatch = useDispatch();

    const onInvite = useCallback((values: Store) => {
        dispatch(inviteOrganizationMembersAsync(organizationInstance, values.users, () => {
            fetchMembers();
        }));
        setVisibleInviteModal(false);
    }, [organizationInstance, fetchMembers]);
    const onCancelInvite = useCallback(() => {
        setVisibleInviteModal(false);
    }, []);

    useEffect(() => {
        const listener = (event: MouseEvent): void => {
            const divElement = descriptionEditingRef.current;
            if (editingDescription && divElement && !event.composedPath().includes(divElement)) {
                setEditingDescription(false);
            }
        };

        window.addEventListener('mousedown', listener);
        return () => {
            window.removeEventListener('mousedown', listener);
        };
    });

    const onRemove = (): void => {
        const modal = Modal.confirm({
            onOk: () => {
                dispatch(removeOrganizationAsync(organizationInstance));
            },
            content: (
                <div className='cvat-remove-organization-submit'>
                    <Text type='warning'>
                        要删除组织，
                        请在下方输入其简称
                    </Text>
                    <Input
                        onChange={
                            (event: React.ChangeEvent<HTMLInputElement>) => {
                                modal.update({
                                    okButtonProps: {
                                        disabled: event.target.value !== organizationInstance.slug,
                                        danger: true,
                                    },
                                });
                            }
                        }
                    />
                </div>
            ),
            okButtonProps: {
                disabled: true,
                danger: true,
            },
            okText: '移除',
        });
    };

    const onSubmitDescription = useCallback((values: { description: string }) => {
        if (description !== values.description) {
            dispatch(
                updateOrganizationAsync(
                    organizationInstance,
                    { description: values.description },
                ),
            );
        }
        setEditingDescription(false);
    }, [description]);

    const onFinishContactsEditing = useCallback(() => {
        if (!_.isEqual(contact, editingRef.current.contact)) {
            dispatch(
                updateOrganizationAsync(
                    organizationInstance,
                    { contact: editingRef.current.contact },
                ),
            );
        }
    }, [contact]);

    return (
        <>
            <Row justify='space-between'>
                <Col span={24}>
                    <div className='cvat-organization-top-bar-descriptions'>
                        <Row justify='space-between'>
                            <Col>
                                <Text>
                                    <Text className='cvat-title'>{`组织：${slug} `}</Text>
                                </Text>
                            </Col>
                            <Col>
                                <Dropdown
                                    menu={{
                                        items: [
                                            {
                                                key: MenuActions.SET_WEBHOOKS,
                                                label: <Link to='/organization/webhooks'>设置 Webhook</Link>,
                                            },
                                            ...(owner && userID === owner.id ? [{
                                                type: 'divider' as const,
                                            }, {
                                                key: MenuActions.REMOVE_ORGANIZATION,
                                                onClick: onRemove,
                                                label: '删除组织',
                                            }] : []),
                                        ],
                                        className: 'cvat-organization-actions-menu',
                                    }}
                                    trigger={['click']}
                                >
                                    <Button size='middle' className='cvat-organization-page-actions-button'>
                                        <Text className='cvat-text-color'>操作</Text>
                                        <MoreOutlined className='cvat-menu-icon' />
                                    </Button>
                                </Dropdown>
                            </Col>
                        </Row>
                        <Text
                            editable={{
                                onStart() {
                                    editingRef.current.name = name;
                                },
                                onChange(value: string) {
                                    editingRef.current.name = value;
                                },
                                onEnd() {
                                    if (name !== editingRef.current.name) {
                                        dispatch(
                                            updateOrganizationAsync(
                                                organizationInstance,
                                                { name: editingRef.current.name },
                                            ),
                                        );
                                    }
                                },
                            }}
                            type='secondary'
                        >
                            {name}
                        </Text>
                        {!editingDescription ? (
                            <span style={{ display: 'grid' }}>
                                {(description || '添加描述').split('\n').map((val: string, idx: number) => (
                                    <Text key={idx} type='secondary'>
                                        {val}
                                        {idx === 0 ? <EditTwoTone onClick={() => setEditingDescription(true)} /> : null}
                                    </Text>
                                ))}
                            </span>
                        ) : (
                            <div ref={descriptionEditingRef}>
                                <Form
                                    onFinish={onSubmitDescription}
                                    initialValues={{ description }}
                                >
                                    <Form.Item name='description'>
                                        <Input.TextArea />
                                    </Form.Item>
                                    <Form.Item>
                                        <Button
                                            className='cvat-submit-new-org-description-button'
                                            type='primary'
                                            htmlType='submit'
                                        >
                                            提交
                                        </Button>
                                    </Form.Item>
                                </Form>
                            </div>
                        )}
                    </div>
                </Col>
                <Col span={12}>
                    <div className='cvat-organization-top-bar-contacts'>
                        <div>
                            <PhoneOutlined />
                            { !contact.phoneNumber ? <Text type='secondary'>添加电话号码</Text> : null }
                            <Text
                                type='secondary'
                                editable={{
                                    onStart() {
                                        editingRef.current.contact = { ...contact };
                                    },
                                    onChange(value: string) {
                                        editingRef.current.contact.phoneNumber = value;
                                    },
                                    onEnd: onFinishContactsEditing,
                                }}
                            >
                                {contact.phoneNumber}
                            </Text>
                        </div>
                        <div>
                            <MailOutlined />
                            { !contact.email ? <Text type='secondary'>添加邮箱</Text> : null }
                            <Text
                                type='secondary'
                                editable={{
                                    onStart() {
                                        editingRef.current.contact = { ...contact };
                                    },
                                    onChange(value: string) {
                                        editingRef.current.contact.email = value;
                                    },
                                    onEnd: onFinishContactsEditing,
                                }}
                            >
                                {contact.email}
                            </Text>
                        </div>
                        <div>
                            <EnvironmentOutlined />
                            { !contact.location ? <Text type='secondary'>添加地址</Text> : null }
                            <Text
                                type='secondary'
                                editable={{
                                    onStart() {
                                        editingRef.current.contact = { ...contact };
                                    },
                                    onChange(value: string) {
                                        editingRef.current.contact.location = value;
                                    },
                                    onEnd: onFinishContactsEditing,
                                }}
                            >
                                {contact.location}
                            </Text>
                        </div>
                        <Text type='secondary'>{`创建于 ${dayjs(createdDate).format('MMMM Do YYYY')}`}</Text>
                        <Text type='secondary'>{`更新于 ${dayjs(updatedDate).fromNow()}`}</Text>
                    </div>
                </Col>
                <Col span={12} className='cvat-organization-top-bar-buttons-block'>
                    <Space align='end'>
                        {!(owner && userID === owner.id) ? (
                            <Button
                                className='cvat-leave-org-button'
                                type='primary'
                                danger
                                onClick={() => {
                                    Modal.confirm({
                                        onOk: () => {
                                            dispatch(leaveOrganizationAsync(organizationInstance, () => {
                                                localStorage.removeItem('currentOrganization');
                                                window.location.reload();
                                            }));
                                        },
                                        className: 'cvat-modal-organization-leave-confirm',
                                        content: (
                                            <>
                                                <Text>请确认是否要离开组织</Text>
                                                <Text strong>{` ${organizationInstance.slug}`}</Text>
                                                <Text>。离开后将无法继续访问该组织的数据。</Text>
                                            </>
                                        ),
                                        okText: '离开',
                                        okButtonProps: {
                                            danger: true,
                                        },
                                    });
                                }}
                            >
                                离开组织
                            </Button>
                        ) : null}
                        <Button
                            className='cvat-invite-org-members-button'
                            type='primary'
                            onClick={() => setVisibleInviteModal(true)}
                            icon={<PlusCircleOutlined />}
                        >
                            邀请成员
                        </Button>
                    </Space>
                </Col>
            </Row>
            <Row className='cvat-organization-page-filters-wrapper' justify='space-between'>
                <Col>
                    <Input.Search
                        enterButton
                        onSearch={(phrase: string) => {
                            onApplySearch(phrase);
                        }}
                        defaultValue={query.search ?? ''}
                        className='cvat-organization-page-search-bar'
                        placeholder='搜索 ...'
                    />
                    <ResourceSelectionInfo selectedCount={selectedCount} onSelectAll={onSelectAll} />
                </Col>
                <Col>
                    <SortingComponent
                        visible={visibility.sorting}
                        onVisibleChange={(visible: boolean) => (
                            setVisibility({ ...defaultVisibility, sorting: visible })
                        )}
                        defaultFields={query.sort?.split(',') || ['-ID']}
                        sortingFields={['User', 'Role']}
                        onApplySorting={onApplySorting}
                    />
                    <FilteringComponent
                        value={query.filter}
                        predefinedVisible={visibility.predefined}
                        builderVisible={visibility.builder}
                        recentVisible={visibility.recent}
                        onPredefinedVisibleChange={(visible: boolean) => (
                            setVisibility({ ...defaultVisibility, predefined: visible })
                        )}
                        onBuilderVisibleChange={(visible: boolean) => (
                            setVisibility({ ...defaultVisibility, builder: visible })
                        )}
                        onRecentVisibleChange={(visible: boolean) => (
                            setVisibility({
                                ...defaultVisibility, builder: visibility.builder, recent: visible,
                            })
                        )}
                        onApplyFilter={onApplyFilter}
                    />
                </Col>
            </Row>
            {
                visibleInviteModal && (
                    <InvitationModal
                        onInvite={onInvite}
                        onCancelInvite={onCancelInvite}
                    />
                )
            }

        </>
    );
}

export default React.memo(OrganizationTopBar);

