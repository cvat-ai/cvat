// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT
import React from 'react';
import Location from './location';
import consts from '../../consts';

interface Props {
    selectedRegion: any;
    onSelectRegion: any;
    internalCommonProps: any;
}

export default function S3Region(props: Props): JSX.Element {
    const {
        selectedRegion,
        onSelectRegion,
        internalCommonProps,
    } = props;
    return (
        <Location
            selectedRegion={selectedRegion}
            onSelectRegion={onSelectRegion}
            internalCommonProps={internalCommonProps}
            values={consts.DEFAULT_AWS_S3_REGIONS}
            name='region'
            label='Region'
            href='https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions'
        />
    );
}
