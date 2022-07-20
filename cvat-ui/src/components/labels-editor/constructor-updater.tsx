// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useRef } from 'react';

import { ShapeType } from 'cvat-core-wrapper';
import LabelForm from './label-form';
import { LabelOptColor } from './common';
import SkeletonConfigurator from './skeleton-configurator';

interface Props {
    label: LabelOptColor;
    onUpdate: (label: LabelOptColor | null) => void;
}

export default function ConstructorUpdater(props: Props): JSX.Element {
    const { label, onUpdate } = props;
    const { type } = label;
    const skeletonConfiguratorRef = useRef<SkeletonConfigurator>(null);

    return (
        <div className='cvat-label-constructor-updater'>
            <LabelForm label={label} onSubmit={onUpdate} />
            {
                type === ShapeType.SKELETON && (
                    <>
                        <SkeletonConfigurator
                            onSubmit={() => {}}
                            ref={skeletonConfiguratorRef}
                            label={label}
                            disabled={label.id as number > 0}
                        />
                    </>
                )
            }
        </div>
    );
}
