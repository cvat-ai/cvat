// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import LabelForm from './label-form';
import { Label } from './common';

interface Props {
    labelNames: string[];
    onCreate: (label: Label | null) => void;
}

export default function ConstructorCreator(props: Props): JSX.Element {
    const { onCreate, labelNames } = props;
    return (
        <div className='cvat-label-constructor-creator'>
            <LabelForm label={null} onSubmit={onCreate} labelNames={labelNames} />
        </div>
    );
}
