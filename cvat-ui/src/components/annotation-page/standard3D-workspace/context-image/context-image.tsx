// Copyright (C) 2020 Intel Corporation
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

    const renderImage = (): JSX.Element => {
        if (loaded) {
            if (data === '') {
                return null;
            }
            return <img src={data} alt='Context not available' className='cvat-contextImage-show' />;
        }

        return <div className='cvat-contextImage-loading'> Loading</div>;
    };

    return <div>{!contextImageHide ? <div className='cvat-contextImage'>{renderImage()}</div> : null}</div>;
}
