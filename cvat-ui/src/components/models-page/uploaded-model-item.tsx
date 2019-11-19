import React from 'react';

import { Model } from '../../reducers/interfaces';

interface Props {
    model: Model;
}

export default function (props: Props) {
    return (
        <div className='cvat-models-list-item'>{props.model.name}</div>
    );
}
