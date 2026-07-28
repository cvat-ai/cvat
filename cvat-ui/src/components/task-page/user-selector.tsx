// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect, useRef } from 'react';
import { SelectValue, RefSelectProps } from 'antd/lib/select';
import Autocomplete from 'antd/lib/auto-complete';
import Input from 'antd/lib/input';
import debounce from 'lodash/debounce';

import { User, getCore, ServerError } from 'cvat-core-wrapper';
import { getCVATStore } from 'cvat-store';
import { handleDropdownKeyDown } from 'utils/dropdown-utils';
import { useUpdateEffect } from 'utils/hooks';

const core = getCore();

interface Props {
    value: User | null;
    username?: string;
    className?: string;
    onSelect: (user: User | null) => void;
}

const searchUsers = debounce(
    (searchValue: string, setUsers: (users: User[]) => void): void => {
        core.users
            .get({
                search: searchValue,
                limit: 10,
                is_active: true,
            }).then((result: User[]) => {
                if (result) {
                    setUsers(result);
                }
            }).catch((error: unknown) => {
                // user may get logged out while debouncing
                // it is normal situation
                if (!(error instanceof ServerError && error.code === 401)) {
                    throw error;
                }
            });
    }, 500,
);

const initialUsersStorage: {
    storage: Record<string, {
        promise: Promise<User[]>,
        timestamp: number,
    }>,
    get(userID?: number, organizationSlug?: string): Promise<User[]>;
} = {
    storage: {},
    get(userID?: number, organizationSlug?: string): Promise<User[]> {
        if (typeof userID === 'undefined') {
            return Promise.resolve([]);
        }

        const key = `${userID}_${organizationSlug || ''}`;
        const RELOAD_INITIAL_USERS_AFTER_MS = 300000;
        if (key in this.storage && (Date.now() - this.storage[key].timestamp) < RELOAD_INITIAL_USERS_AFTER_MS) {
            return this.storage[key].promise;
        }

        this.storage[key] = {
            promise: core.users.get({ limit: 10, is_active: true }),
            timestamp: Date.now(),
        };

        this.storage[key].promise.catch(() => {
            delete this.storage[key];
        });

        return this.storage[key].promise;
    },
};

export default function UserSelector(props: Readonly<Props>): JSX.Element {
    const {
        value, className, username, onSelect,
    } = props;
    const [searchPhrase, setSearchPhrase] = useState(username || '');
    const [initialUsers, setInitialUsers] = useState<User[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const autocompleteRef = useRef<RefSelectProps | null>(null);

    useEffect(() => {
        const state = getCVATStore().getState();
        const userID = state.auth.user?.id;
        const organizationSlug = state.organizations.current?.slug;
        initialUsersStorage.get(userID, organizationSlug).then((result: User[]) => {
            if (result) {
                setInitialUsers(result);
            }
        });
    }, []);

    useEffect(() => {
        setUsers(initialUsers);
    }, [initialUsers]);

    useEffect(() => {
        if (searchPhrase) {
            searchUsers(searchPhrase, setUsers);
        } else {
            setUsers(initialUsers);
        }
    }, [searchPhrase]);

    const onBlur = (): void => {
        if (!searchPhrase && value) {
            onSelect(null);
        } else if (searchPhrase) {
            const potentialUsers = users.filter((_user) => _user.username.includes(searchPhrase));
            if (potentialUsers.length === 1) {
                setSearchPhrase(potentialUsers[0].username);
                if (value?.id !== potentialUsers[0].id) {
                    onSelect(potentialUsers[0]);
                }
            } else {
                setSearchPhrase(value?.username || '');
            }
        }
    };

    const handleSelect = (_value: SelectValue): void => {
        if (_value === 'RESET_ASSIGNEE') {
            onSelect(null);
            setSearchPhrase('');
        } else {
            const user = _value ? users.filter((_user) => _user.id === +_value)[0] : null;
            if ((user?.id || null) !== (value?.id || null)) {
                onSelect(user);
            }
        }
    };

    useUpdateEffect(() => {
        if (value && !users.filter((user) => user.id === value.id).length) {
            core.users.get({ id: value.id }).then((result: User[]) => {
                const [user] = result;
                if (user) {
                    setUsers([...users, user]);
                }
            });
        }
    }, [value]);

    useEffect(() => {
        if (value) {
            setSearchPhrase(value.username);
        } else {
            setSearchPhrase('');
        }
    }, [value]);

    const combinedClassName = className ? `${className} cvat-user-search-field` : 'cvat-user-search-field';
    return (
        <Autocomplete
            ref={autocompleteRef}
            value={searchPhrase}
            placeholder='Select a user'
            onSearch={setSearchPhrase}
            onSelect={handleSelect}
            onBlur={onBlur}
            onKeyDown={handleDropdownKeyDown}
            className={combinedClassName}
            popupClassName='cvat-user-search-dropdown'
            options={[
                ...(!searchPhrase || 'reset assignee'.includes(searchPhrase.toLowerCase()) ? [{
                    value: 'RESET_ASSIGNEE',
                    label: 'Reset assignee',
                }] : []),
                ...users.map((user) => ({
                    value: user.id.toString(),
                    label: user.username,
                })),
            ]}
        >
            <Input onPressEnter={() => autocompleteRef.current?.blur()} />
        </Autocomplete>
    );
}
