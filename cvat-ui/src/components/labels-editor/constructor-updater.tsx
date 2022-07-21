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
    onUpdate: (label: LabelOptColor | null) => void;
}

export default function ConstructorUpdater(props: Props): JSX.Element {
    const { label, onUpdate } = props;
    const { type } = label;
    const skeletonConfiguratorRef = useRef<SkeletonConfigurator>(null);
    const onSubmitLabelConf = useCallback((labelConfiguration: LabelOptColor | null) => {
        onUpdate(labelConfiguration);
    }, [onUpdate]);

    const onSkeletonSubmit = useCallback((): SkeletonConfiguration | null => {
        if (skeletonConfiguratorRef.current) {
            return skeletonConfiguratorRef.current.submit();
        }

        return null;
    }, [skeletonConfiguratorRef]);

    return (
        <div className='cvat-label-constructor-updater'>
            <LabelForm
                label={label}
                onSubmit={onSubmitLabelConf}
                onSkeletonSubmit={type === 'skeleton' ? onSkeletonSubmit : undefined}
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
