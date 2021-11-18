// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { Row, Col } from 'antd/lib/grid';
import Select from 'antd/lib/select';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import { PlusOutlined } from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';
import { CombinedState } from 'reducers/interfaces';
import { useHistory } from 'react-router';
import { switchSettingsDialog } from 'actions/settings-actions';

function OrganizationSettingsComponent(): JSX.Element {
    const dispatch = useDispatch();
    const history = useHistory();
    const organizationsFetching = useSelector((state: CombinedState) => state.organizations.fetching);
    const organizationsList = useSelector((state: CombinedState) => state.organizations.list);
    const currentOrganization = useSelector((state: CombinedState) => state.organizations.current);

    return (
        <div className='cvat-organizations-settings'>
            <Row>
                <Col span={24}>
                    <Text>List of current organizations</Text>
                </Col>
                <Col>
                    <Select
                        className='cvat-organizations-settings-list'
                        disabled={organizationsFetching}
                        value={currentOrganization ? currentOrganization.slug : undefined}
                        onChange={(value: string) => {
                            const [organization] = organizationsList
                                .filter((_org: any): boolean => _org.slug === value);
                            if (organization) {
                                if (!currentOrganization || currentOrganization.slug !== organization.slug) {
                                    localStorage.setItem('currentOrganization', organization.slug);
                                    if (/\d+$/.test(window.location.pathname)) {
                                        // a resource is opened (task/job/etc.)
                                        window.location.pathname = '/';
                                    } else {
                                        window.location.reload();
                                    }
                                }
                            }
                        }}
                    >
                        {organizationsList.map((org: any): JSX.Element => (
                            <Select.Option className='cvat-organizations-settings-list-item' value={org.slug} key={org.slug}>
                                <CVATTooltip overlay={org.name}>
                                    <div>
                                        <Text strong={currentOrganization && org.slug === currentOrganization.slug}>
                                            {org.slug}
                                        </Text>
                                    </div>
                                </CVATTooltip>

                            </Select.Option>
                        ))}
                    </Select>
                </Col>
                <Col offset={1}>
                    <Button
                        type='primary'
                        icon={<PlusOutlined />}
                        onClick={() => {
                            dispatch(switchSettingsDialog(false));
                            history.push('/organizations/create');
                        }}
                    />
                </Col>
            </Row>
            {
                currentOrganization ? (
                    <Row>
                        <Col span={24}>
                            <Text>Go to your personal resources</Text>
                        </Col>
                        <Col>
                            <Button
                                onClick={() => {
                                    localStorage.removeItem('currentOrganization');
                                    if (/\d+$/.test(window.location.pathname)) {
                                        window.location.pathname = '/';
                                    } else {
                                        window.location.reload();
                                    }
                                }}
                            >
                                Log off
                            </Button>
                        </Col>
                    </Row>
                ) : null
            }
        </div>
    );
}

export default React.memo(OrganizationSettingsComponent);
