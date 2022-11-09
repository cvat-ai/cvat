// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import React, { useState } from 'react';
import Icon from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';
import { ClearIcon } from 'icons';
import { Input } from 'antd';

interface SocialAccountLinkProps {
    id?: string;
    prefix: string;
    autoComplete?: string;
    placeholder: string;
    value?: string;
    onReset: () => void;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function CVATSigningInput(props: SocialAccountLinkProps): JSX.Element {
    const {
        id, prefix, autoComplete, onReset, placeholder, value, onChange,
    } = props;
    const [valueNonEmpty, setValueNonEmpty] = useState(false);
    return (
        <Input
            value={value}
            autoComplete={autoComplete}
            placeholder={placeholder}
            prefix={<Text>{prefix}</Text>}
            id={id}
            suffix={(
                valueNonEmpty ? (
                    <Icon
                        component={ClearIcon}
                        onClick={() => {
                            setValueNonEmpty(false);
                            onReset();
                        }}
                    />
                ) : null
            )}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const { value: inputValue } = event.target;
                setValueNonEmpty(!!inputValue);
                if (onChange) onChange(event);
            }}
        />
    );
}

export default React.memo(CVATSigningInput);
