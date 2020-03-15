// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Select,
} from 'antd';

interface Props {
    value: string | null;
    users: any[];
    onChange: (user: string) => void;
}

export default function UserSelector(props: Props): JSX.Element {
    const {
        value,
        users,
        onChange,
    } = props;

    return (
        <Select
            defaultValue={value || '—'}
            size='small'
            showSearch
            className='cvat-user-selector'
            onChange={onChange}
        >
            <Select.Option key='-1' value='—'>—</Select.Option>
            { users.map((user): JSX.Element => (
                <Select.Option key={user.id} value={user.username}>
                    {user.username}
                </Select.Option>
            ))}
        </Select>
    );
}
