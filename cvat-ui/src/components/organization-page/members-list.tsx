// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import Pagination from 'antd/lib/pagination';
import Spin from 'antd/lib/spin';

import MemberItem from './member-item';

export interface Props {
    organizationInstance: any;
    userInstance: any;
}

function fetchMembers(
    organizationInstance: any,
    page: number,
    pageSize: number,
    setMembers: (members: any[]) => void,
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

function MembersList(props: Props): JSX.Element {
    const { organizationInstance } = props;
    const { owner } = organizationInstance;
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [fetching, setFetching] = useState<boolean>(true);
    const [members, setMembers] = useState<any[]>([]);

    useEffect(() => {
        fetchMembers(organizationInstance, pageNumber, pageSize, setMembers, setFetching);
    }, []);

    useEffect(() => {
        fetchMembers(organizationInstance, pageNumber, pageSize, setMembers, setFetching);
    }, [pageSize]);

    return fetching ? (
        <Spin className='cvat-spinner' />
    ) : (
        <>
            <div>
                {members.map(
                    (member: any): JSX.Element => (
                        <MemberItem key={member.user.id} ownerID={owner.id} membershipInstance={member} />
                    ),
                )}
            </div>
            <div className='cvat-organization-members-pagination-block'>
                <Pagination
                    total={members.length ? (members as any).count : 0}
                    pageSize={pageSize}
                    onShowSizeChange={(_: number, newShowSize: number) => {
                        setPageSize(newShowSize);
                    }}
                    onChange={(current: number) => {
                        setPageNumber(current);
                    }}
                    showSizeChanger
                    showQuickJumper
                />
            </div>
        </>
    );
}

export default React.memo(MembersList);
