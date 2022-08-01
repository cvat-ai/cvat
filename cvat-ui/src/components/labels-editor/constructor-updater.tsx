// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import LabelForm from './label-form';
import { Label } from './common';

interface Props {
    label: Label;
    onUpdate: (label: Label) => void;
    onCancel: () => void;
}

export default function ConstructorUpdater(props: Props): JSX.Element {
    const { label, onUpdate, onCancel } = props;

    return (
        <div className='cvat-label-constructor-updater'>
            <LabelForm label={label} onSubmit={onUpdate} onCancel={onCancel} />
        </div>
    );
}
