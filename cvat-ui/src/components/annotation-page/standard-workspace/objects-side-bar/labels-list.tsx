import React from 'react';

interface Props {
    annotations: any[];
    labels: any[];
    listHeight: number;
    onAnnotationsUpdated(annotations: any[]): void;
}

export default function LabelsList(props: Props): JSX.Element {
    const {
        labels,
        listHeight,
    } = props;

    return (
        <div style={{ height: listHeight }} className='cvat-objects-sidebar-labels-list'>
            { labels.map((label: any) => <div key={label.id}>{label.name}</div>)}
        </div>
    );
}
