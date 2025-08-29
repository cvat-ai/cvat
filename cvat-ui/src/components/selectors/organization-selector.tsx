// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { CombinedState } from 'reducers';
import AutoComplete from 'antd/lib/auto-complete';
import { useInView } from 'react-intersection-observer';

import { Organization } from 'cvat-core-wrapper';
import { getOrganizationsAsync } from 'actions/organization-actions';

interface Props {
    setNewOrganization: (org: Organization | null) => void;
    defaultValue?: string;
}

function OrganizationSelector(props: Props): JSX.Element {
    const { setNewOrganization, defaultValue } = props;

    const defaultPage = 1;
    const [page, setPage] = useState(defaultPage);
    const [searchPhrase, setSearchPhrase] = useState(defaultValue || '');
    const [searchResults, setSearchResults] = useState<Organization[]>([]);

    const {
        organizations,
        fetching,
        hasMore,
        currentOrg,
    } = useSelector((state: CombinedState) => ({
        organizations: state.organizations.currentArray,
        fetching: state.organizations.currentArrayFetching,
        hasMore: Boolean(state.organizations.nextPageUrl),
        currentOrg: state.organizations.current,
    }), shallowEqual);

    const [ref, inView] = useInView();
    const dispatch = useDispatch();

    useEffect(() => {
        if (fetching) {
            return;
        }

        if (organizations.length) {
            setSearchResults((prev) => (page === defaultPage ? [...organizations] : [...prev, ...organizations]));
        } else if (page === defaultPage && searchPhrase) {
            setSearchResults([]);
        }
    }, [organizations]);

    useEffect(() => {
        const filterQuery = {
            page: defaultPage,
            search: searchPhrase,
        };
        dispatch(getOrganizationsAsync(filterQuery));
        setPage(defaultPage);
    }, [searchPhrase]);

    useEffect(() => {
        if (page === defaultPage) return;

        const filterQuery = {
            page,
            ...((searchPhrase) ? { search: searchPhrase } : {}),
        };
        dispatch(getOrganizationsAsync(filterQuery));
    }, [page]);

    useEffect(() => {
        if (inView && hasMore && !fetching) {
            setPage((prev) => prev + 1);
        }
    }, [inView]);

    return (
        <AutoComplete
            defaultValue={searchPhrase}
            placeholder='Select an organization'
            showSearch
            onSearch={_.debounce(setSearchPhrase, 500)}
            options={[
                ...(
                    (currentOrg) ? [{
                        value: '',
                        label: 'Personal workspace',
                    }] : []
                ),
                ...searchResults
                    .map((organization, index, array) => ({
                        value: organization.slug,
                        label: (
                            <div ref={index === array.length - 1 ? ref : undefined}>
                                {organization.slug}
                                {organization.name === organization.slug ? '' : ` (${organization.name})`}
                            </div>
                        ),
                        disabled: !!currentOrg && organization.slug === currentOrg.slug,
                    })),
            ]}
            onSelect={(value: string) => {
                if (value === '') {
                    setNewOrganization(null);
                } else {
                    const organization = searchResults
                        .find((org_): boolean => org_.slug === value);
                    if (organization) {
                        setNewOrganization(organization);
                    }
                }
            }}
            allowClear
            className='cvat-organization-selector'
        />
    );
}

export default React.memo(OrganizationSelector);
