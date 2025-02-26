// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Empty from 'antd/lib/empty';
import Spin from 'antd/lib/spin';

import { CombinedState } from 'reducers';
import { Membership, Organization, OrganizationMembersFilter } from 'cvat-core-wrapper';
import { filterNull } from 'utils/filter-null';
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
        .then((_members: any[]) => {
            console.log(_members);
            setMembers(_members);
        })
        .catch(() => {})
        .finally(() => {
            setFetching(false);
        });
}

function OrganizationPage(): JSX.Element | null {
    const organization = useSelector((state: CombinedState) => state.organizations.current);
    const fetching = useSelector((state: CombinedState) => state.organizations.fetching);
    const updating = useSelector((state: CombinedState) => state.organizations.updating);
    const user = useSelector((state: CombinedState) => state.auth.user);
    const [membersFetching, setMembersFetching] = useState<boolean>(true);
    const [members, setMembers] = useState<Membership[]>([]);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [query, setQuery] = useState<string | null>(null);

    const fetchMembersCallback = useCallback(() => {
        if (organization) {
            const filter: Partial<OrganizationMembersFilter> = filterNull({
                search: query,
                page: pageNumber,
                pageSize,
            });
            fetchMembers(organization, filter, setMembers, setMembersFetching);
        }
    }, [pageSize, pageNumber, query, organization]);

    useEffect(() => {
        fetchMembersCallback();
    }, [pageSize, pageNumber, query, organization]);

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
                        onSearch={setQuery}
                    />
                    <MembersList
                        fetching={membersFetching}
                        members={members}
                        organizationInstance={organization}
                        userInstance={user}
                        pageSize={pageSize}
                        pageNumber={pageNumber}
                        setPageNumber={setPageNumber}
                        setPageSize={setPageSize}
                        fetchMembers={fetchMembersCallback}
                    />
                </>
            )}
        </div>
    );
}

export default React.memo(OrganizationPage);
