// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { useSelector } from 'react-redux';
import Empty from 'antd/lib/empty';
import Spin from 'antd/lib/spin';

import { CombinedState } from 'reducers/interfaces';
import TopBarComponent from './top-bar';
import MembersList from './members-list';

function OrganizationPage(): JSX.Element | null {
    const organization = useSelector((state: CombinedState) => state.organizations.current);
    const organizationsFetching = useSelector((state: CombinedState) => state.organizations.fetching);
    const user = useSelector((state: CombinedState) => state.auth.user);

    if (organizationsFetching) {
        return <Spin className='cvat-spinner' />;
    }

    return (
        <div className='cvat-organization-page'>
            {!organization ? (
                <Empty description='You are not in an organization' />
            ) : (
                <>
                    <TopBarComponent organizationInstance={organization} userInstance={user} />
                    <MembersList organizationInstance={organization} userInstance={user} />
                </>
            )}
        </div>
    );
}

export default React.memo(OrganizationPage);
