// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useRef } from 'react';

import { ShapeType } from 'cvat-core-wrapper';
import LabelForm from './label-form';
import { LabelOptColor, SkeletonConfiguration } from './common';
import SkeletonConfigurator from './skeleton-configurator';

interface Props {
    label: LabelOptColor;
    labelNames: string[];
    onUpdate: (label: LabelOptColor) => void;
    onCancel: () => void;
}

function ConstructorUpdater(props: Props): JSX.Element {
    const {
        label, labelNames, onUpdate, onCancel,
    } = props;
    const { type } = label;
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
        <div className='cvat-label-constructor-updater'>
            <LabelForm
                label={label}
                labelNames={labelNames}
                onSubmit={onUpdate}
                resetSkeleton={type === 'skeleton' ? resetSkeleton : undefined}
                onSkeletonSubmit={type === 'skeleton' ? onSkeletonSubmit : undefined}
                onCancel={onCancel}
            />
            {
                type === ShapeType.SKELETON && (
                    <SkeletonConfigurator
                        ref={skeletonConfiguratorRef}
                        label={label}
                        disabled={label.id as number > 0}
                    />
                )
            }
        </div>
    );
}

export default React.memo(ConstructorUpdater);
