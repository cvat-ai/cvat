// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useRef } from 'react';

import LabelForm from './label-form';
import { LabelOptColor, SkeletonConfiguration } from './common';
import SkeletonConfigurator from './skeleton-configurator';

interface Props {
    labelNames: string[];
    creatorType: 'basic' | 'skeleton';
    onCreate: (label: LabelOptColor | null) => void;
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
    const skeletonConfiguratorRef = useRef<SkeletonConfigurator>(null);

    const onSubmitLabelConf = useCallback((labelConfiguration: LabelOptColor | null) => {
        onCreate(labelConfiguration);
    }, [onCreate]);

    const onSkeletonSubmit = useCallback((): SkeletonConfiguration | null => {
        if (skeletonConfiguratorRef.current) {
            return skeletonConfiguratorRef.current.submit();
        }

        return null;
    }, [skeletonConfiguratorRef]);

    return (
        <div className='cvat-label-constructor-creator'>
            <LabelForm
                label={null}
                labelNames={labelNames}
                onSubmit={onSubmitLabelConf}
                onSkeletonSubmit={creatorType === 'skeleton' ? onSkeletonSubmit : undefined}
            />
            {
                creatorType === 'skeleton' && (
                    <SkeletonConfigurator label={null} ref={skeletonConfiguratorRef} />
                )
            }
        </div>
    );
}

export default React.memo(ConstructorCreator, compareProps);
