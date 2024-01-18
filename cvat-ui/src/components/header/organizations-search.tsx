// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import AutoComplete from 'antd/lib/auto-complete';
import notification from 'antd/lib/notification';

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
            }).catch((error: unknown) => {
                setSearchResults([]);
                notification.error({
                    message: 'Could not receive a list of organizations',
                    description: error instanceof Error ? error.message : '',
                });
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
                value: '',
                label: 'Personal workspace',
            }, ...organizationsList.map((organization) => ({
                value: organization.slug,
                label: `${organization.slug}${organization.name === organization.slug ? '' : ` (${organization.name})`}`,
            }))]}
            onSelect={(value: string) => {
                if (value === '') {
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
