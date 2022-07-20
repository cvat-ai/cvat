// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useRef, useState } from 'react';
import Alert from 'antd/lib/alert';

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
    const [labelConfiguration, setLabelConfiguration] = useState<LabelOptColor | null>(null);
    const [error, setError] = useState<string | null>(null);
    const onSubmitSkeletonConf = useCallback((data: SkeletonConfiguration) => {
        if (labelConfiguration) {
            const label = {
                ...labelConfiguration,
                ...data,
                type: (labelConfiguration.type || 'any' as LabelOptColor['type']),
            } as LabelOptColor;

            onCreate(label);
        }
    }, [labelConfiguration]);

    return (
        <div className='cvat-label-constructor-creator'>
            <LabelForm
                label={null}
                labelNames={labelNames}
                onSubmit={(label: LabelOptColor | null) => {
                    if (label && creatorType === 'skeleton') {
                        setLabelConfiguration({ ...label });
                        if (skeletonConfiguratorRef.current) {
                            try {
                                setError(null);
                                skeletonConfiguratorRef.current.submit();
                            } catch (_error: any) {
                                setError(_error.toString());
                            }
                        }
                    } else {
                        onCreate(label);
                    }
                }}
            />
            {
                creatorType === 'skeleton' && (
                    <>
                        <SkeletonConfigurator onSubmit={onSubmitSkeletonConf} ref={skeletonConfiguratorRef} />
                        { error !== null && <Alert type='error' message={error} /> }
                    </>
                )
            }
        </div>
    );
}

export default React.memo(ConstructorCreator, compareProps);
