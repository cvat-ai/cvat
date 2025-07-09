import React from 'react';
import Select from 'antd/lib/select';

export interface MemberRoleSelectorProps {
    value: string;
    onChange: (role: string) => void;
    disabled?: boolean;
}

const roleOptions = [
    { value: 'worker', label: 'Worker' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'maintainer', label: 'Maintainer' },
    { value: 'owner', label: 'Owner' },
];

export default function MemberRoleSelector(props: MemberRoleSelectorProps): JSX.Element {
    const { value, onChange, disabled } = props;
    return (
        <Select
            value={value}
            onChange={onChange}
            disabled={disabled || value === 'owner'}
            className='cvat-organization-member-role-selector'
        >
            {value === 'owner' ? (
                <Select.Option value='owner'>Owner</Select.Option>
            ) : (
                roleOptions.filter((option) => option.value !== 'owner').map((option) => (
                    <Select.Option key={option.value} value={option.value}>{option.label}</Select.Option>
                ))
            )}
        </Select>
    );
}
