// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import AutoComplete from 'antd/lib/auto-complete';
import { useInView } from 'react-intersection-observer';

import { Organization } from 'cvat-core-wrapper';
import { getOrganizationsAsync } from 'actions/organization-actions';
import { useSelector, useDispatch } from 'react-redux';
import { CombinedState } from 'reducers';

function OrganizationSelector(props: {
    setNewOrganization: (org: Organization | null) => void;
    defaultValue?: string
}): JSX.Element {
    const {
        setNewOrganization,
        defaultValue,
    } = props;

    const defaultPage = 1;
    const [page, setPage] = useState(defaultPage);
    const [searchPhrase, setSearchPhrase] = useState(defaultValue || '');
    const [searchResults, setSearchResults] = useState<Organization[]>([]);

    const organizations = useSelector((state: CombinedState) => state.organizations.currentArray);
    const fetching = useSelector((state: CombinedState) => state.organizations.currentArrayFetching);
    const hasMore = useSelector((state: CombinedState) => Boolean(state.organizations.nextPageUrl));
    const showSandboxOption = useSelector((state: CombinedState) => Boolean(state.organizations.current));

    const [ref, inView] = useInView();

    const dispatch = useDispatch();

    useEffect(() => {
        if (fetching) return;

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
            placeholder='Type to search'
            showSearch
            onSearch={_.debounce(setSearchPhrase, 500)}
            options={[
                ...(
                    (showSandboxOption) ? [{
                        value: '',
                        label: 'Personal workspace',
                    }] : []
                ),
                ...searchResults.map((organization, index, array) => {
                    const isLastItem = index === array.length - 1;

                    return {
                        value: organization.slug,
                        label: (
                            <div ref={(isLastItem) ? ref : undefined}>
                                {organization.slug}
                                {organization.name === organization.slug ? '' : ` (${organization.name})`}
                            </div>
                        ),
                    };
                }),
            ]}
            onSelect={(value: string) => {
                if (value === '') {
                    setNewOrganization(null);
                } else {
                    const organization = searchResults
                        .find((_organization): boolean => _organization.slug === value);
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
