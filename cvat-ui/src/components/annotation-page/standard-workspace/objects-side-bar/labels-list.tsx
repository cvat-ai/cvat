import React from 'react';

import LabelItem from './label-item';

interface Props {
    annotations: any[];
    labels: any[];
    colors: string[];
    listHeight: number;
    onAnnotationsUpdated(annotations: any[]): void;
    onChangeLabelColor(label: any, color: string): void;
}

export default function LabelsList(props: Props): JSX.Element {
    const {
        labels,
        colors,
        listHeight,
        annotations,
        onChangeLabelColor,
    } = props;

    return (
        <div style={{ height: listHeight }} className='cvat-objects-sidebar-labels-list'>
            { labels.map((label: any): JSX.Element => {
                const statesVisible = annotations
                    .filter((state: any) => state.label.id === label.id)
                    .reduce((acc: boolean, state: any) => acc && !state.visible, true);
                const statesLocked = annotations
                    .filter((state: any) => state.label.id === label.id)
                    .reduce((acc: boolean, state: any) => acc && state.lock, true);

                return (
                    <LabelItem
                        statesVisible={statesVisible}
                        statesLocked={statesLocked}
                        colors={colors}
                        key={label.id}
                        label={label}
                        onChangeLabelColor={onChangeLabelColor}
                    />
                );
            })}
        </div>
    );
}
