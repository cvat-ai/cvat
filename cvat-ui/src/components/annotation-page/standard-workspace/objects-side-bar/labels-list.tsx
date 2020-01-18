import React from 'react';

interface Props {
    annotations: any[];
    onAnnotationsUpdated(annotations: any[]): void;
}

export default function LabelsList(props: Props): JSX.Element {
    return (
        <div className='cvat-objects-sidebar-labels-list' />
    );
}
