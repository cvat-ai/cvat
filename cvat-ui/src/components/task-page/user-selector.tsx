// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect, useRef } from 'react';
import { SelectValue, RefSelectProps } from 'antd/lib/select';
import Autocomplete from 'antd/lib/auto-complete';
import Input from 'antd/lib/input';
import debounce from 'lodash/debounce';

import getCore from 'cvat-core-wrapper';

const core = getCore();

export interface User {
    id: number;
    username: string;
}

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
            })
            .then((result: User[]) => {
                if (result) {
                    setUsers(result);
                }
            });
    },
    250,
    {
        maxWait: 750,
    },
);

export default function UserSelector(props: Props): JSX.Element {
    const {
        value, className, username, onSelect,
    } = props;
    const [searchPhrase, setSearchPhrase] = useState(username || '');
    const [initialUsers, setInitialUsers] = useState<User[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const autocompleteRef = useRef<RefSelectProps | null>(null);

    useEffect(() => {
        core.users.get({ limit: 10, is_active: true }).then((result: User[]) => {
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

    const handleSearch = (searchValue: string): void => {
        setSearchPhrase(searchValue);
    };

    const onBlur = (): void => {
        if (!searchPhrase && value) {
            onSelect(null);
        } else if (searchPhrase) {
            const potentialUsers = users.filter((_user) => _user.username.includes(searchPhrase));
            if (potentialUsers.length === 1) {
                setSearchPhrase(potentialUsers[0].username);
                onSelect(potentialUsers[0]);
            } else {
                setSearchPhrase(value?.username || '');
            }
        }
    };

    const handleSelect = (_value: SelectValue): void => {
        const user = _value ? users.filter((_user) => _user.id === +_value)[0] : null;
        if ((user?.id || null) !== (value?.id || null)) {
            onSelect(user);
        }
    };

    useEffect(() => {
        if (value) {
            if (!users.filter((user) => user.id === value.id).length) {
                core.users.get({ id: value.id }).then((result: User[]) => {
                    const [user] = result;
                    if (user) {
                        setUsers([...users, user]);
                    }
                });
            }

            setSearchPhrase(value.username);
        }
    }, [value]);

    const combinedClassName = className ? `${className} cvat-user-search-field` : 'cvat-user-search-field';
    return (
        <Autocomplete
            ref={autocompleteRef}
            value={searchPhrase}
            placeholder='Select a user'
            onSearch={handleSearch}
            onSelect={handleSelect}
            onBlur={onBlur}
            className={combinedClassName}
            options={users.map((user) => ({
                value: user.id.toString(),
                label: user.username,
            }))}
        >
            <Input onPressEnter={() => autocompleteRef.current?.blur()} />
        </Autocomplete>
    );
}
