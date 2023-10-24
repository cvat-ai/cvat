// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Empty from 'antd/lib/empty';
import Spin from 'antd/lib/spin';

import { CombinedState } from 'reducers';
import { Membership } from 'cvat-core-wrapper';
import TopBarComponent from './top-bar';
import MembersList from './members-list';

function fetchMembers(
    organizationInstance: any,
    page: number,
    pageSize: number,
    setMembers: (members: Membership[]) => void,
    setFetching: (fetching: boolean) => void,
): void {
    setFetching(true);
    organizationInstance
        .members(page, pageSize)
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
    const fetching = useSelector((state: CombinedState) => state.organizations.fetching);
    const updating = useSelector((state: CombinedState) => state.organizations.updating);
    const user = useSelector((state: CombinedState) => state.auth.user);
    const [membersFetching, setMembersFetching] = useState<boolean>(true);
    const [members, setMembers] = useState<Membership[]>([]);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    useEffect(() => {
        if (organization) {
            fetchMembers(organization, pageNumber, pageSize, setMembers, setMembersFetching);
        }
    }, [pageSize, pageNumber, organization]);

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
                        fetchMembers={() => fetchMembers(
                            organization, pageNumber, pageSize, setMembers, setMembersFetching,
                        )}
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
                        fetchMembers={() => fetchMembers(
                            organization, pageNumber, pageSize, setMembers, setMembersFetching,
                        )}
                    />
                </>
            )}
        </div>
    );
}

export default React.memo(OrganizationPage);
