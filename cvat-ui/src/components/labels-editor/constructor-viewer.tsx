import React from 'react';

import ConstructorViewerItem from './constructor-viewer-item';

interface ConstructorViewerProps {
    labels: any;
    onUpdate: (label: any) => void;
    onDelete: (label: any) => void;
}

const colors = [
    '#ff811e', '#9013fe', '#0074d9',
    '#549ca4', '#e8c720', '#3d9970',
    '#6b2034', '#2c344c', '#2ecc40',
];

let currentColor = 0;

function nextColor() {
    const color = colors[currentColor];
    currentColor += 1;
    if (currentColor >= colors.length) {
        currentColor = 0;
    }
    return color;
}

export default function ConstructorViewer(props: ConstructorViewerProps) {
    const list = [];
    for (const label of props.labels) {
        list.push(
            <ConstructorViewerItem
                onUpdate={props.onUpdate}
                onDelete={props.onDelete}
                label={label}
                key={label.id}
                color={nextColor()}
            />
        )
    }

    return (
        <div className='cvat-constructor-viewer'>
            { list }
        </div>
    );
}