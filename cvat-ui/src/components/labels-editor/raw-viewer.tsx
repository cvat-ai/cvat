import React from 'react';

import {
    Input,
} from 'antd';

import { Label } from './common';

interface RawViewerProps {
    labels: Label[];
}

export default function RawViewer(props: RawViewerProps) {
    const textLabels = JSON.stringify(props.labels, null, 2);
    return (
        <Input.TextArea className='cvat-raw-labels-viewer' rows={5} value={textLabels}/>
    );
}