// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Pagination from 'antd/lib/pagination';
import Spin from 'antd/lib/spin';

import { useSelector } from 'react-redux';
import { CombinedState, SelectedResourceType } from 'reducers';
import { Membership } from 'cvat-core-wrapper';
import BulkWrapper from 'components/bulk-wrapper';
import MemberItem from './member-item';
import EmptyListComponent from './empty-list';

export interface Props {
    organizationInstance: any;
    userInstance: any;
    fetching: boolean;
    pageSize: number;
    pageNumber: number;
    members: Membership[];
    onPageChange: (page: number, pageSize: number) => void;
    fetchMembers: () => void;
}

function MembersList(props: Readonly<Props>): JSX.Element {
    const {
        fetching, members, pageSize, pageNumber, fetchMembers, onPageChange,
    } = props;
    const inviting = useSelector((state: CombinedState) => state.organizations.inviting);
    const updatingMember = useSelector((state: CombinedState) => state.organizations.updatingMember);
    const removingMember = useSelector((state: CombinedState) => state.organizations.removingMember);

    if (fetching || inviting || updatingMember || removingMember) {
        return <Spin className='cvat-spinner' />;
    }

    const content = members.length ? (
        <>
            <div className='cvat-organization-members-list'>
                <BulkWrapper
                    currentResourceIds={members.map((member) => member.id)}
                    resourceType={SelectedResourceType.MEMBERS}
                >
                    {(selectProps) => (
                        <>
                            {members.map((member, idx) => (
                                <MemberItem
                                    key={member.id}
                                    membershipInstance={member}
                                    fetchMembers={fetchMembers}
                                    {...selectProps(member.id, idx)}
                                />
                            ))}
                        </>
                    )}
                </BulkWrapper>
            </div>
            <div className='cvat-organization-members-pagination-block'>
                <Pagination
                    total={members.length ? (members as any).count : 0}
                    onChange={(current: number, newPageSize: number) => {
                        onPageChange(current, newPageSize);
                    }}
                    current={pageNumber}
                    pageSize={pageSize}
                    showSizeChanger
                    showQuickJumper
                />
            </div>
        </>
    ) : (
        <EmptyListComponent />
    );

    return content;
}

export default React.memo(MembersList);
