import React from 'react';
import Select from 'antd/lib/select';
import { handleDropdownKeyDown } from 'utils/dropdown-utils';

export interface MemberRoleSelectorProps {
    value: string | null;
    onChange: (role: string) => void;
    disabled?: boolean;
}

const roleOptions = [
    { value: 'worker', label: '工作人员' },
    { value: 'supervisor', label: '主管' },
    { value: 'maintainer', label: '维护者' },
    { value: 'owner', label: '所有者' },
];

export default function MemberRoleSelector(props: Readonly<MemberRoleSelectorProps>): JSX.Element {
    const { value, onChange, disabled } = props;

    return (
        <Select
            value={value}
            onChange={onChange}
            disabled={disabled || value === 'owner'}
            onKeyDown={handleDropdownKeyDown}
            className='cvat-organization-member-role-selector'
            placeholder='选择角色'
        >
            {value === 'owner' ? (
                <Select.Option value='owner'>所有者</Select.Option>
            ) : (
                roleOptions.filter((option) => option.value !== 'owner').map((option) => (
                    <Select.Option key={option.value} value={option.value}>{option.label}</Select.Option>
                ))
            )}
        </Select>
    );
}

