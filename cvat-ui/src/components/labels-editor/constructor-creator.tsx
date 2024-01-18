// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useRef } from 'react';

import LabelForm from './label-form';
import { LabelOptColor, SkeletonConfiguration } from './common';
import SkeletonConfigurator from './skeleton-configurator';
import PickFromModelComponent from './pick-from-model';

interface Props {
    labelNames: string[];
    creatorType: 'basic' | 'skeleton' | 'model';
    onCreate: (label: LabelOptColor) => void;
    onCancel: () => void;
}

function compareProps(prevProps: Props, nextProps: Props): boolean {
    return (
        prevProps.onCreate === nextProps.onCreate &&
        prevProps.onCancel === nextProps.onCancel &&
        prevProps.creatorType === nextProps.creatorType &&
        prevProps.labelNames.length === nextProps.labelNames.length &&
        prevProps.labelNames.every((value: string, index: number) => nextProps.labelNames[index] === value)
    );
}

function ConstructorCreator(props: Props): JSX.Element {
    const {
        onCreate, onCancel, labelNames, creatorType,
    } = props;
    const skeletonConfiguratorRef = useRef<SkeletonConfigurator>(null);

    const onSkeletonSubmit = useCallback((): SkeletonConfiguration | null => {
        if (skeletonConfiguratorRef.current) {
            return skeletonConfiguratorRef.current.submit();
        }

        return null;
    }, [skeletonConfiguratorRef]);

    const resetSkeleton = useCallback((): void => {
        if (skeletonConfiguratorRef.current) {
            skeletonConfiguratorRef.current.reset();
        }
    }, [skeletonConfiguratorRef]);

    return (
        <div className='cvat-label-constructor-creator'>
            { creatorType === 'model' ? (
                <PickFromModelComponent
                    labelNames={labelNames}
                    onCancel={onCancel}
                    onCreate={onCreate}
                />
            ) : (
                <>
                    <LabelForm
                        label={null}
                        labelNames={labelNames}
                        onSubmit={onCreate}
                        onSkeletonSubmit={creatorType === 'skeleton' ? onSkeletonSubmit : undefined}
                        resetSkeleton={creatorType === 'skeleton' ? resetSkeleton : undefined}
                        onCancel={onCancel}
                    />
                    {creatorType === 'skeleton' && (
                        <SkeletonConfigurator label={null} ref={skeletonConfiguratorRef} />
                    )}
                </>
            )}
        </div>
    );
}

export default React.memo(ConstructorCreator, compareProps);
