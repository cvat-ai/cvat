// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Organization, getCore } from 'cvat-core-wrapper';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers';

const core = getCore();

function OrganizationWatcher(): JSX.Element {
    const organizationList = useSelector((state: CombinedState) => state.organizations.list);

    const changeOrganization = (newOrg: number | string | null, location?: string): void => {
        let newOrganization: Organization | null = null;
        if (newOrg) {
            if (Number.isInteger(newOrg)) {
                newOrganization = organizationList.find((org) => org.id === newOrg);
            } else if (typeof newOrg === 'string') {
                newOrganization = organizationList.find((org) => org.slug === newOrg);
            }

            if (newOrganization) {
                localStorage.setItem('currentOrganization', newOrganization.slug);
            }
        } else {
            localStorage.removeItem('currentOrganization');
        }

        const shouldReload = (!newOrg || newOrganization);
        if (shouldReload && location) {
            window.location.pathname = location;
            window.location.search = '';
        } else if (shouldReload) {
            window.location.reload();
        }
    };

    useEffect(() => {
        core.config.onOrganizationChange = (newOrgId: number | null) => {
            changeOrganization(newOrgId);
        };
    }, []);

    return <></>;
}

export default React.memo(OrganizationWatcher);
