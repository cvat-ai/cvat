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

function compareProps(prevProps: Props, nextProps: Props): boolean {
    if (prevProps.onCreate !== nextProps.onCreate) {
        return false;
    }
    if (
        !(
            prevProps.labelNames.length === nextProps.labelNames.length &&
            prevProps.labelNames
                .map((value, index) => value === nextProps.labelNames[index])
                .reduce((prevValue, curValue) => prevValue && curValue, true)
        )
    ) {
        return false;
    }
    return true;
}

function ConstructorCreator(props: Props): JSX.Element {
    const { onCreate, labelNames } = props;
    return (
        <div className='cvat-label-constructor-creator'>
            <LabelForm label={null} onSubmit={onCreate} labelNames={labelNames} />
        </div>
    );
}

export default React.memo(ConstructorCreator, compareProps);
