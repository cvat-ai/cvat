import React from 'react';

import {
    Input,
} from 'antd';

interface RawViewerProps {
    labels: any;
}

export default function RawViewer(props: RawViewerProps) {
    const textLabels = JSON.stringify(props.labels, null, 4);
    return (
        <Input.TextArea className='cvat-raw-labels-viewer' rows={5} defaultValue={textLabels}/>
    );
}