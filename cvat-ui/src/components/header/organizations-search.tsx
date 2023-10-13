// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import AutoComplete from 'antd/lib/auto-complete';

import { Organization } from 'cvat-core-wrapper';

function OrganizationsSearch(props: {
    defaultOrganizationList: Organization[] | null;
    searchOrganizations: (search?: string) => Promise<Organization[]>;
    resetOrganization: (search?: string) => void;
    setNewOrganization: (org: Organization) => void;
}): JSX.Element {
    const {
        defaultOrganizationList, searchOrganizations, resetOrganization, setNewOrganization,
    } = props;
    const [searchPhrase, setSearchPhrase] = useState('');
    const [searchResults, setSearchResults] = useState<Organization[]>([]);

    useEffect(() => {
        if (searchPhrase) {
            searchOrganizations(searchPhrase).then((organizations) => {
                setSearchResults(organizations);
            });
        }
    }, [searchPhrase]);

    const organizationsList = searchPhrase ? searchResults : (defaultOrganizationList || []);
    return (
        <AutoComplete
            defaultValue={searchPhrase}
            placeholder='Type to search'
            showSearch
            onSearch={_.debounce(setSearchPhrase, 500)}
            options={[{
                value: '$personal',
                label: 'Personal workspace',
            }, ...organizationsList.map((organization) => ({
                value: organization.slug,
                label: organization.name,
            }))]}
            onSelect={(value: string) => {
                if (value === '$personal') {
                    resetOrganization();
                } else {
                    const organization = organizationsList
                        .find((_organization): boolean => _organization.slug === value);
                    if (organization) {
                        setNewOrganization(organization);
                    }
                }
            }}
            allowClear
            className='cvat-modal-organization-selector'
        />
    );
}

export default React.memo(OrganizationsSearch);
