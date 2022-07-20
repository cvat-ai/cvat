// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import LabelForm from './label-form';
import { LabelOptColor } from './common';

interface Props {
    label: LabelOptColor;
    onUpdate: (label: LabelOptColor | null) => void;
}

export default function ConstructorUpdater(props: Props): JSX.Element {
    const { label, onUpdate } = props;

    return (
        <div className='cvat-label-constructor-updater'>
            <LabelForm label={label} onSubmit={onUpdate} />
        </div>
    );
}
