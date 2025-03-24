// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useState, useRef, useEffect, useCallback,
} from 'react';
import { useHistory } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import moment from 'moment';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Modal from 'antd/lib/modal';
import Button from 'antd/lib/button';
import Space from 'antd/lib/space';
import Input from 'antd/lib/input';
import Popover from 'antd/lib/popover';
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
import { SortingComponent, ResourceFilterHOC, defaultVisibility } from 'components/resource-sorting-filtering';
import Menu from 'components/dropdown-menu';
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
}

export enum MenuActions {
    SET_WEBHOOKS = 'SET_WEBHOOKS',
    REMOVE_ORGANIZATION = 'REMOVE_ORGANIZATION',
}

const FilteringComponent = ResourceFilterHOC(
    config, localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues,
);

function OrganizationTopBar(props: Props): JSX.Element {
    const {
        organizationInstance, userInstance, fetchMembers, query,
        onApplyFilter, onApplySearch, onApplySorting,
    } = props;
    const {
        owner, createdDate, description, updatedDate, slug, name, contact,
    } = organizationInstance;
    const { id: userID } = userInstance;
    const descriptionEditingRef = useRef<HTMLDivElement>(null);
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
                        To remove the organization,
                        enter its short name below
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
            okText: 'Remove',
        });
    };

    let organizationName = name;
    let organizationDescription = description;
    let organizationContacts = contact;
    const history = useHistory();

    return (
        <>
            <Row justify='space-between'>
                <Col span={24}>
                    <div className='cvat-organization-top-bar-descriptions'>
                        <Row justify='space-between'>
                            <Col>
                                <Text>
                                    <Text className='cvat-title'>{`Organization: ${slug} `}</Text>
                                </Text>
                            </Col>
                            <Col>
                                <Popover
                                    trigger={['click']}
                                    destroyTooltipOnHide
                                    overlayInnerStyle={{ padding: 0 }}
                                    content={() => (
                                        <Menu className='cvat-organization-actions-menu'>
                                            <Menu.Item key={MenuActions.SET_WEBHOOKS}>
                                                <a
                                                    href='/organization/webhooks'
                                                    onClick={(e: React.MouseEvent) => {
                                                        e.preventDefault();
                                                        history.push({
                                                            pathname: '/organization/webhooks',
                                                        });
                                                        return false;
                                                    }}
                                                >
                                                    Setup webhooks
                                                </a>
                                            </Menu.Item>
                                            {owner && userID === owner.id ? (
                                                <Menu.Item
                                                    key={MenuActions.REMOVE_ORGANIZATION}
                                                    onClick={onRemove}
                                                >
                                                    Remove organization
                                                </Menu.Item>
                                            ) : null}
                                        </Menu>
                                    )}
                                >
                                    <Button size='middle' className='cvat-organization-page-actions-button'>
                                        <Text className='cvat-text-color'>Actions</Text>
                                        <MoreOutlined className='cvat-menu-icon' />
                                    </Button>
                                </Popover>
                            </Col>

                        </Row>

                        <Text
                            editable={{
                                onChange: (value: string) => {
                                    organizationName = value;
                                },
                                onEnd: () => {
                                    organizationInstance.name = organizationName;
                                    dispatch(updateOrganizationAsync(organizationInstance));
                                },
                            }}
                            type='secondary'
                        >
                            {name}
                        </Text>
                        {!editingDescription ? (
                            <span style={{ display: 'grid' }}>
                                {(description || 'Add description').split('\n').map((val: string, idx: number) => (
                                    <Text key={idx} type='secondary'>
                                        {val}
                                        {idx === 0 ? <EditTwoTone onClick={() => setEditingDescription(true)} /> : null}
                                    </Text>
                                ))}
                            </span>
                        ) : (
                            <div ref={descriptionEditingRef}>
                                <Input.TextArea
                                    defaultValue={description}
                                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                                        organizationDescription = event.target.value;
                                    }}
                                />
                                <Button
                                    className='cvat-submit-new-org-description-button'
                                    size='small'
                                    type='primary'
                                    onClick={() => {
                                        if (organizationDescription !== description) {
                                            organizationInstance.description = organizationDescription;
                                            dispatch(updateOrganizationAsync(organizationInstance));
                                        }
                                        setEditingDescription(false);
                                    }}
                                >
                                    Submit
                                </Button>
                            </div>
                        )}
                    </div>
                </Col>
                <Col span={12}>
                    <div className='cvat-organization-top-bar-contacts'>
                        <div>
                            <PhoneOutlined />
                            { !contact.phoneNumber ? <Text type='secondary'>Add phone number</Text> : null }
                            <Text
                                type='secondary'
                                editable={{
                                    onChange: (value: string) => {
                                        organizationContacts = {
                                            ...organizationInstance.contact, phoneNumber: value,
                                        };
                                    },
                                    onEnd: () => {
                                        organizationInstance.contact = organizationContacts;
                                        dispatch(updateOrganizationAsync(organizationInstance));
                                    },
                                }}
                            >
                                {contact.phoneNumber}
                            </Text>
                        </div>
                        <div>
                            <MailOutlined />
                            { !contact.email ? <Text type='secondary'>Add email</Text> : null }
                            <Text
                                type='secondary'
                                editable={{
                                    onChange: (value: string) => {
                                        organizationContacts = {
                                            ...organizationInstance.contact, email: value,
                                        };
                                    },
                                    onEnd: () => {
                                        organizationInstance.contact = organizationContacts;
                                        dispatch(updateOrganizationAsync(organizationInstance));
                                    },
                                }}
                            >
                                {contact.email}
                            </Text>
                        </div>
                        <div>
                            <EnvironmentOutlined />
                            { !contact.location ? <Text type='secondary'>Add location</Text> : null }
                            <Text
                                type='secondary'
                                editable={{
                                    onChange: (value: string) => {
                                        organizationContacts = {
                                            ...organizationInstance.contact, location: value,
                                        };
                                    },
                                    onEnd: () => {
                                        organizationInstance.contact = organizationContacts;
                                        dispatch(updateOrganizationAsync(organizationInstance));
                                    },
                                }}
                            >
                                {contact.location}
                            </Text>
                        </div>
                        <Text type='secondary'>{`Created ${moment(createdDate).format('MMMM Do YYYY')}`}</Text>
                        <Text type='secondary'>{`Updated ${moment(updatedDate).fromNow()}`}</Text>
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
                                                <Text>Please, confirm leaving the organization</Text>
                                                <Text strong>{` ${organizationInstance.slug}`}</Text>
                                                <Text>. You will not have access to the organization data anymore</Text>
                                            </>
                                        ),
                                        okText: 'Leave',
                                        okButtonProps: {
                                            danger: true,
                                        },
                                    });
                                }}
                            >
                                Leave organization
                            </Button>
                        ) : null}
                        <Button
                            className='cvat-invite-org-members-button'
                            type='primary'
                            onClick={() => setVisibleInviteModal(true)}
                            icon={<PlusCircleOutlined />}
                        >
                            Invite members
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
                        defaultValue={query.search || ''}
                        className='cvat-organization-page-search-bar'
                        placeholder='Search ...'
                    />
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
