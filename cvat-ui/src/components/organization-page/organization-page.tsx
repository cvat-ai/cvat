// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Empty from 'antd/lib/empty';
import Spin from 'antd/lib/spin';

import { CombinedState, OrganizationMembersQuery } from 'reducers';
import { Membership, Organization, OrganizationMembersFilter } from 'cvat-core-wrapper';
import { filterNull } from 'utils/filter-null';
import { selectionActions } from 'actions/selection-actions';
import TopBarComponent from './top-bar';
import MembersList from './members-list';

function fetchMembers(
    organizationInstance: Organization,
    filter: OrganizationMembersFilter,
    setMembers: (members: Membership[]) => void,
    setFetching: (fetching: boolean) => void,
): void {
    setFetching(true);
    organizationInstance
        .members(filter)
        .then((_members: Membership[]) => {
            setMembers(_members);
        })
        .catch(() => {})
        .finally(() => {
            setFetching(false);
        });
}

function OrganizationPage(): JSX.Element | null {
    const dispatch = useDispatch();
    const organization = useSelector((state: CombinedState) => state.organizations.current);
    const fetching = useSelector((state: CombinedState) => state.organizations.fetching);
    const updating = useSelector((state: CombinedState) => state.organizations.updating);
    const user = useSelector((state: CombinedState) => state.auth.user);
    const selectedIds = useSelector((state: CombinedState) => state.selection.selected);
    const [membersFetching, setMembersFetching] = useState<boolean>(true);
    const [members, setMembers] = useState<Membership[]>([]);
    const [query, setQuery] = useState<OrganizationMembersQuery>({
        search: null,
        filter: null,
        sort: null,
        page: 1,
        pageSize: 10,
    });

    const fetchMembersCallback = useCallback(() => {
        if (organization) {
            const filter: Partial<OrganizationMembersFilter> = filterNull(query);
            fetchMembers(organization, filter, setMembers, setMembersFetching);
        }
    }, [query, organization]);

    const changePage = useCallback((page: number, pageSize: number) => {
        setQuery({
            ...query,
            page,
            pageSize,
        });
    }, [query]);

    const allMembeshipsIds = members.map((m) => m.id);
    const onSelectAll = useCallback(() => {
        dispatch(selectionActions.selectResources(allMembeshipsIds));
    }, [allMembeshipsIds]);

    useEffect(() => {
        fetchMembersCallback();
    }, [query, organization]);

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
                            setQuery({
                                ...query,
                                search,
                                page: 1,
                            });
                        }}
                        onApplyFilter={(filter: string | null) => {
                            setQuery({
                                ...query,
                                filter,
                                page: 1,
                            });
                        }}
                        onApplySorting={(sort: string | null) => {
                            setQuery({
                                ...query,
                                sort,
                                page: 1,
                            });
                        }}
                        selectedCount={selectedIds.length}
                        onSelectAll={onSelectAll}
                    />
                    <MembersList
                        fetching={membersFetching}
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
