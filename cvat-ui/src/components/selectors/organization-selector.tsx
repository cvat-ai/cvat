// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import AutoComplete from 'antd/lib/auto-complete';
import notification from 'antd/lib/notification';

import { Organization, getCore } from 'cvat-core-wrapper';

const core = getCore();

// TODO: make a base selector?
function OrganizationSelector(props: {
    defaultOrganizationList?: Organization[];
    defaultHasMore?: boolean;
    showSandboxOption?: boolean;
    searchOrganizations?: (search?: string, page?: number) => (
        Promise<{ organizations: Organization[]; hasNextPage: boolean }>
    );
    setNewOrganization: (org: Organization | null) => void;
}): JSX.Element {
    const {
        defaultOrganizationList, defaultHasMore, showSandboxOption, searchOrganizations, setNewOrganization,
    } = props;
    const [searchPhrase, setSearchPhrase] = useState('');
    // TODO: fetch the first page when default list is not provided
    const [searchResults, setSearchResults] = useState<Organization[]>(defaultOrganizationList ?? []);
    const defaultPage = 1;
    const [page, setPage] = useState(defaultPage);
    const [hasMore, setHasMore] = useState(defaultHasMore ?? false);

    const [featching, setFeatching] = useState(false);

    // todo: refactor
    const searchCallback = (
        search_?: string, page_: number = 1,
    ): Promise<{ organizations: Organization[]; hasNextPage: boolean }> => new Promise((resolve, reject) => {
        const listOrgsFilter = {
            page: page_,
            page_size: 12,
            ...(search_ ? { search: search_ } : {}),
        };
        const promise = core.organizations.get(listOrgsFilter, true);

        promise.then((result: { organizations: Organization[]; hasNextPage: boolean }) => {
            resolve(result);
        }).catch((error: unknown) => {
            reject(error);
        }).finally(() => {
            console.log('finally');
        });
    });

    useEffect(() => {
        if (searchPhrase) {
            setFeatching(true);
            let promise = null;
            if (searchOrganizations) {
                promise = searchOrganizations(searchPhrase, defaultPage);
            } else {
                promise = searchCallback(searchPhrase, defaultPage);
            }
            promise.then((
                { organizations, hasNextPage }: { organizations: Organization[]; hasNextPage: boolean },
            ) => {
                setSearchResults(organizations);
                setPage(defaultPage);
                setHasMore(hasNextPage);
                console.log('Has more? (search phrase effect)', hasNextPage);
            }).catch((error: unknown) => {
                setSearchResults([]);
                notification.error({
                    message: 'Could not receive a list of organizations',
                    description: error instanceof Error ? error.message : '',
                });
            }).finally(() => {
                setFeatching(false);
            });
        }
    }, [searchPhrase]);

    useEffect(() => {
        if (page !== defaultPage) {
            setFeatching(true);
            let promise = null;
            if (searchOrganizations) {
                promise = searchOrganizations(searchPhrase, page);
            } else {
                promise = searchCallback(searchPhrase, page);
            }
            promise.then((
                { organizations, hasNextPage }: { organizations: Organization[]; hasNextPage: boolean },
            ) => {
                setSearchResults((prev) => [...prev, ...organizations]);
                setHasMore(hasNextPage);
            }).catch((error: unknown) => {
                setSearchResults([]);
                setPage(defaultPage);
                notification.error({
                    message: 'Could not receive a list of organizations',
                    description: error instanceof Error ? error.message : '',
                });
            }).finally(() => {
                setFeatching(false);
            });
        }
    }, [page]);

    const handlePopupScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (((target.scrollTop + target.offsetHeight) >= (target.scrollHeight - 10)) && hasMore && !featching) {
            setPage((prev) => prev + 1);
            console.log('Page was increased');
        }
    };

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
                ...searchResults.map((organization) => ({
                    value: organization.slug,
                    label: `${organization.slug}${organization.name === organization.slug ? '' : ` (${organization.name})`}`,
                })),
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
            onPopupScroll={handlePopupScroll}
            allowClear
            className='cvat-modal-organization-selector'
        />
    );
}

export default React.memo(OrganizationSelector);
