// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Spin from 'antd/lib/spin';

import { CombinedState } from 'reducers/interfaces';
import { getContextImage } from 'actions/annotation-actions';

export default function ContextImage(): JSX.Element | null {
    const frame = useSelector((state: CombinedState) => state.annotation.player.frame.number);
    const contextImageData = useSelector((state: CombinedState) => state.annotation.player.contextImage.data);
    const contextImageHidden = useSelector((state: CombinedState) => state.annotation.player.contextImage.hidden);
    const contextImageFetching = useSelector((state: CombinedState) => state.annotation.player.contextImage.fetching);
    const contextImageFetchingFailed = useSelector(
        (state: CombinedState) => state.annotation.player.contextImage.failed,
    );
    const dispatch = useDispatch();

    useEffect(() => {
        if (!contextImageHidden && contextImageData === null && !contextImageFetching && !contextImageFetchingFailed) {
            dispatch(getContextImage());
        }
    }, [contextImageHidden, frame, contextImageFetching]);

    if (contextImageFetching) {
        return (
            <div className='cvat-context-image-wrapper'>
                <Spin size='small' />
            </div>
        );
    }

    if (!contextImageHidden && contextImageData !== null) {
        return (
            <div className='cvat-context-image-wrapper'>
                <img src={contextImageData} alt='Context is not available' className='cvat-context-image' />
            </div>
        );
    }

    return null;
}
