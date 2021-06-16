// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { CloudStorage } from 'reducers/interfaces';

interface Props {
    cloudStorageInstance: CloudStorage;
}

export default function CloudStorageItemComponent(props: Props): JSX.Element {
    // eslint-disable-next-line
    const { cloudStorageInstance } = props;

    return <div className='cvat-cloud-storage-item' />;
}
