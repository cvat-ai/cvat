// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Empty from 'antd/lib/empty';
import Spin from 'antd/lib/spin';

import { CombinedState } from 'reducers/interfaces';
import TopBarComponent from './top-bar';
import MembersList from './members-list';

function fetchMembers(
    organizationInstance: any,
    page: number,
    pageSize: number,
    setMembers: (members: any[]) => void,
    setFetching: (fetching: boolean) => void,
): void {
    setFetching(true);
    organizationInstance
        .members(page + 1, pageSize)
        .then((_members: any[]) => {
            setMembers(_members);
        })
        .catch(() => {})
        .finally(() => {
            setFetching(false);
        });
}

function OrganizationPage(): JSX.Element | null {
    const organization = useSelector((state: CombinedState) => state.organizations.current);
    const organizationsFetching = useSelector((state: CombinedState) => state.organizations.fetching);
    const user = useSelector((state: CombinedState) => state.auth.user);
    const [fetching, setFetching] = useState<boolean>(true);
    const [members, setMembers] = useState<any[]>([]);
    const [pageNumber, setPageNumber] = useState<number>(0);
    const [pageSize, setPageSize] = useState<number>(10);

    useEffect(() => {
        if (organization) {
            fetchMembers(organization, pageNumber, pageSize, setMembers, setFetching);
        }
    }, [pageSize, pageNumber, organization]);

    if (organizationsFetching) {
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
                        fetchMembers={() => fetchMembers(organization, pageNumber, pageSize, setMembers, setFetching)}
                    />
                    <MembersList
                        fetching={fetching}
                        members={members}
                        organizationInstance={organization}
                        userInstance={user}
                        pageSize={pageSize}
                        setPageNumber={setPageNumber}
                        setPageSize={setPageSize}
                        fetchMembers={() => fetchMembers(organization, pageNumber, pageSize, setMembers, setFetching)}
                    />
                </>
            )}
        </div>
    );
}

export default React.memo(OrganizationPage);
