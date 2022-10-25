// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { FormInstance } from 'antd/lib/form';
import Input from 'antd/lib/input';
import { ClearIcon } from 'icons';
import Icon from '@ant-design/icons';

interface Props {
    form: FormInstance;
    fieldValue: string;
    placeholder: string;
    prefix: JSX.Element;
    autoComplete?: string;
}

export default function CVATSignInInput(props: Props): JSX.Element {
    const {
        form, fieldValue, placeholder, autoComplete, prefix,
    } = props;
    const [inputNonEmpty, setInputNonEmpty] = useState(false);
    const internalAutoComplete = autoComplete || fieldValue;
    return (
        <Input
            autoComplete={internalAutoComplete}
            placeholder={placeholder}
            prefix={prefix}
            suffix={(
                inputNonEmpty ? (
                    <Icon
                        component={ClearIcon}
                        onClick={() => {
                            console.log({ [fieldValue]: '' });
                            form.setFieldsValue({ [fieldValue]: '' });
                        }}
                    />
                ) : null
            )}
            onChange={(event) => {
                const { value } = event.target;
                setInputNonEmpty(!!value);
            }}
        />
    );
}
