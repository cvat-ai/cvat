// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCore } from 'cvat-core-wrapper';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers';

const core = getCore();

function OrganizationWatcher(): JSX.Element {
    const organizationList = useSelector((state: CombinedState) => state.organizations.list);

    useEffect(() => {
        core.config.onOrganizationChange = (newOrgId: number | null) => {
            if (newOrgId === null) {
                localStorage.removeItem('currentOrganization');
            } else {
                const newOrganization = organizationList.find((org) => org.id === newOrgId);
                localStorage.setItem('currentOrganization', newOrganization.slug);
            }
            window.location.reload();
        };
    }, []);

    return <></>;
}

export default React.memo(OrganizationWatcher);
