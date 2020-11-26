// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect, useRef } from 'react';
import Autocomplete from 'antd/lib/auto-complete';
import Input from 'antd/lib/input';

import getCore from 'cvat-core-wrapper';
import { SelectValue } from 'antd/lib/select';

import debounce from 'lodash/debounce';

const core = getCore();

export interface User {
    id: number;
    username: string;
}

interface Props {
    value: User | null;
    onSelect: (user: User | null) => void;
}

const searchUsers = debounce(
    (searchValue: string, setUsers: (users: User[]) => void): void => {
        core.users
            .get({
                search: searchValue,
                limit: 10,
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
    const { value, onSelect } = props;
    const [searchPhrase, setSearchPhrase] = useState('');

    const [users, setUsers] = useState<User[]>([]);
    const autocompleteRef = useRef<Autocomplete | null>(null);

    const handleSearch = (searchValue: string): void => {
        if (searchValue) {
            searchUsers(searchValue, setUsers);
        } else {
            setUsers([]);
        }
        setSearchPhrase(searchValue);
    };

    const handleFocus = (open: boolean): void => {
        if (!users.length && open) {
            core.users.get({ limit: 10 }).then((result: User[]) => {
                if (result) {
                    setUsers(result);
                }
            });
        }
        if (!open && searchPhrase !== value?.username) {
            setSearchPhrase('');
            if (value) {
                onSelect(null);
            }
        }
    };

    const handleSelect = (_value: SelectValue): void => {
        setSearchPhrase(users.filter((user) => user.id === +_value)[0].username);
        onSelect(_value ? users.filter((user) => user.id === +_value)[0] : null);
    };

    useEffect(() => {
        if (value && !users.filter((user) => user.id === value.id).length) {
            core.users.get({ id: value.id }).then((result: User[]) => {
                const [user] = result;
                setUsers([...users, user]);
                setSearchPhrase(user.username);
            });
        }
    }, [value]);

    return (
        <Autocomplete
            ref={autocompleteRef}
            value={searchPhrase}
            placeholder='Select a user'
            onSearch={handleSearch}
            onSelect={handleSelect}
            className='cvat-user-search-field'
            onDropdownVisibleChange={handleFocus}
            dataSource={users.map((user) => ({
                value: user.id.toString(),
                text: user.username,
            }))}
        >
            <Input onPressEnter={() => autocompleteRef.current?.blur()} />
        </Autocomplete>
    );
}
