// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowsAltOutlined, ShrinkOutlined } from '@ant-design/icons';
import Spin from 'antd/lib/spin';
import Image from 'antd/lib/image';

import { CombinedState } from 'reducers/interfaces';
import { hideShowContextImage, getContextImage } from 'actions/annotation-actions';
import CVATTooltip from 'components/common/cvat-tooltip';

export default function ContextImage(): JSX.Element | null {
    const dispatch = useDispatch();
    const { number: frame, hasRelatedContext } = useSelector((state: CombinedState) => state.annotation.player.frame);
    const { data: contextImageData, hidden: contextImageHidden, fetching: contextImageFetching } = useSelector(
        (state: CombinedState) => state.annotation.player.contextImage,
    );
    const [requested, setRequested] = useState(false);

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

    if (!hasRelatedContext) {
        return null;
    }

    return (
        <div className='cvat-context-image-wrapper' {...(contextImageHidden ? { style: { width: '40px' } } : {})}>
            <div className='cvat-context-image-wrapper-header' />
            {contextImageFetching ? <Spin size='small' /> : null}
            {contextImageHidden ? (
                <CVATTooltip title='A context image is available'>
                    <ArrowsAltOutlined onClick={() => dispatch(hideShowContextImage(false))} />
                </CVATTooltip>
            ) : (
                <>
                    <ShrinkOutlined onClick={() => dispatch(hideShowContextImage(true))} />
                    <Image
                        {...(contextImageData ? { src: contextImageData } : {})}
                        alt='Could not get context'
                        className='cvat-context-image'
                    />
                </>
            )}
        </div>
    );
}
