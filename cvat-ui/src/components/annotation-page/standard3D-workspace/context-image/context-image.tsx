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
        frame, contextImageHide, loaded, data, getContextImage,
    } = props;

    useEffect(() => {
        if (!contextImageHide && !loaded) {
            getContextImage();
        }
    }, [frame, contextImageHide, loaded]);

    const renderImage = (): JSX.Element => {
        if (loaded) {
            if (data === '') {
                return <div>No Image Context</div>;
            }
            return <img src={data} alt='' style={{ maxWidth: '100%', maxHeight: '100%' }} />;
        }

        return <div> Loading</div>;
    };

    return <div>{!contextImageHide ? <div className='cvat-contextImage'>{renderImage()}</div> : null}</div>;
}
