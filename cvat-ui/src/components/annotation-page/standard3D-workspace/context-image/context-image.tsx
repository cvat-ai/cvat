// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';

interface Props {
    frame: number;
    contextImageHide: boolean;
    loaded: boolean;
    data: string;
    getContextImage(): void;
}

export default function ContextImage(props: Props): JSX.Element {
    const {
        contextImageHide, loaded, data, getContextImage,
    } = props;

    useEffect(() => {
        if (!contextImageHide && !loaded) {
            getContextImage();
        }
    }, [contextImageHide, loaded]);

    if (!contextImageHide && data !== '') {
        return (
            <div className='cvat-contextImage'>
                <img src={data} alt='Context not available' className='cvat-contextImage-show' />
            </div>
        );
    }
    return null;
}
