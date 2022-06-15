// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import LabelForm from './label-form';
import { Label } from './common';
import SkeletonConfigurator from './skeleton-configurator';

interface Props {
    labelNames: string[];
    creatorType: 'basic' | 'skeleton';
    onCreate: (label: Label | null) => void;
}

function compareProps(prevProps: Props, nextProps: Props): boolean {
    return (
        prevProps.onCreate === nextProps.onCreate &&
        prevProps.creatorType === nextProps.creatorType &&
        prevProps.labelNames.length === nextProps.labelNames.length &&
        prevProps.labelNames.every((value: string, index: number) => nextProps.labelNames[index] === value)
    );
}

function ConstructorCreator(props: Props): JSX.Element {
    const { onCreate, labelNames, creatorType } = props;
    return (
        <div className='cvat-label-constructor-creator'>
            <LabelForm label={null} onSubmit={onCreate} labelNames={labelNames} />
            {
                creatorType === 'skeleton' && <SkeletonConfigurator />
            }
        </div>
    );
}

export default React.memo(ConstructorCreator, compareProps);
