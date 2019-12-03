import React from 'react';

import {
    Icon,
    Select,
} from 'antd';

interface Props {
    value: string | null;
    users: any[];
    onChange: (user: string) => void;
}

export default function UserSelector(props: Props) {
    return (
        <Select
                defaultValue={props.value ? props.value : '—'}
                size='small'
                showSearch
                className='cvat-user-selector'
                onChange={props.onChange}
            >
                <Select.Option key='-1' value='—'>{'—'}</Select.Option>
                { props.users.map((user) => {
                    return (
                        <Select.Option key={user.id} value={user.username}>
                            {user.username}
                        </Select.Option>
                    );
                })}
            </Select>
    );
}