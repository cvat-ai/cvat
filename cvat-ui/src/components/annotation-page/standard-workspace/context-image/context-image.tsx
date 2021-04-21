// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Spin from 'antd/lib/spin';

import { CombinedState } from 'reducers/interfaces';
import { getContextImage } from 'actions/annotation-actions';

export default function ContextImage(): JSX.Element | null {
    const { number: frame, hasRelatedContext } = useSelector((state: CombinedState) => state.annotation.player.frame);
    const [requested, setRequested] = useState(false);
    const contextImageData = useSelector((state: CombinedState) => state.annotation.player.contextImage.data);
    const contextImageHidden = useSelector((state: CombinedState) => state.annotation.player.contextImage.hidden);
    const contextImageFetching = useSelector((state: CombinedState) => state.annotation.player.contextImage.fetching);
    const dispatch = useDispatch();

    useEffect(() => {
        if (requested) {
            setRequested(false);
        }
    }, [frame]);

    useEffect(() => {
        if (hasRelatedContext && !contextImageHidden && !requested) {
            dispatch(getContextImage());
            setRequested(true);
        }
    }, [contextImageHidden, requested, hasRelatedContext]);

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
