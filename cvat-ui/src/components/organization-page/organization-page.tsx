// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Empty from 'antd/lib/empty';
import Spin from 'antd/lib/spin';

import { CombinedState, SelectedResourceType } from 'reducers';
import { selectionActions } from 'actions/selection-actions';
import { getOrganizationMembersAsync } from 'actions/organization-actions';
import TopBarComponent from './top-bar';
import MembersList from './members-list';

function OrganizationPage(): JSX.Element | null {
    const dispatch = useDispatch();
    const organization = useSelector((state: CombinedState) => state.organizations.current);
    const fetching = useSelector((state: CombinedState) => state.organizations.fetching);
    const updating = useSelector((state: CombinedState) => state.organizations.updating);
    const user = useSelector((state: CombinedState) => state.auth.user);
    const members = useSelector((state: CombinedState) => state.organizations.members);
    const fetchingMembers = useSelector((state: CombinedState) => state.organizations.fetchingMembers);
    const query = useSelector((state: CombinedState) => state.organizations.membersQuery);
    const selectedIds = useSelector((state: CombinedState) => state.organizations.selectedMembers);

    const fetchMembersCallback = useCallback(() => {
        if (organization) {
            dispatch(getOrganizationMembersAsync(
                organization,
                query,
            ));
        }
    }, [query, organization]);

    const changePage = useCallback((page: number, pageSize: number) => {
        if (organization) {
            dispatch(getOrganizationMembersAsync(
                organization,
                {
                    ...query,
                    page,
                    pageSize,
                },
            ));
        }
    }, [organization, query]);

    const allMembeshipsIds = members.map((m) => m.id);
    const onSelectAll = useCallback(() => {
        dispatch(selectionActions.selectResources(allMembeshipsIds, SelectedResourceType.MEMBERS));
    }, [allMembeshipsIds]);

    useEffect(() => {
        fetchMembersCallback();
    }, []);

    if (fetching || updating) {
        return <Spin className='cvat-spinner' />;
    }

    return (
        <div className='cvat-organization-page'>
            {!organization ? (
                <Empty description='You are not in an organization' />
            ) : (
                <>
                    <TopBarComponent
                        organizationInstance={organization}
                        userInstance={user}
                        fetchMembers={fetchMembersCallback}
                        query={query}
                        onApplySearch={(search: string | null) => {
                            dispatch(
                                getOrganizationMembersAsync(organization, {
                                    ...query,
                                    search,
                                    page: 1,
                                }),
                            );
                        }}
                        onApplyFilter={(filter: string | null) => {
                            dispatch(
                                getOrganizationMembersAsync(organization, {
                                    ...query,
                                    filter,
                                    page: 1,
                                }),
                            );
                        }}
                        onApplySorting={(sort: string | null) => {
                            dispatch(
                                getOrganizationMembersAsync(organization, {
                                    ...query,
                                    sort,
                                    page: 1,
                                }),
                            );
                        }}
                        selectedCount={selectedIds.length}
                        onSelectAll={onSelectAll}
                    />
                    <MembersList
                        fetching={fetchingMembers}
                        members={members}
                        organizationInstance={organization}
                        userInstance={user}
                        pageSize={query.pageSize}
                        pageNumber={query.page}
                        onPageChange={changePage}
                        fetchMembers={fetchMembersCallback}
                    />
                </>
            )}
        </div>
    );
}

export default React.memo(OrganizationPage);
