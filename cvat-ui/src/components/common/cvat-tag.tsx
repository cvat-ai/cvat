// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Tag from 'antd/lib/tag';

export enum TagType {
    GROUND_TRUTH = 'ground_truth',
    CONSENSUS = 'consensus',
}

interface TagProps {
    type: TagType;
}

function CVATTag(props: TagProps): JSX.Element | null {
    const { type } = props;

    switch (type) {
        case TagType.GROUND_TRUTH:
            return <Tag className='cvat-tag-ground-truth' color='#ED9C00'>Ground truth</Tag>;
        case TagType.CONSENSUS:
            return <Tag className='cvat-tag-consensus' color='#1890FF'>Consensus</Tag>;
        default:
            return null;
    }
}

export default React.memo(CVATTag);
