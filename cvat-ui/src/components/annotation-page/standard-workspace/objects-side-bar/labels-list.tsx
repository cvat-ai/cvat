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
        onAnnotationsUpdated,
    } = props;

    return (
        <div style={{ height: listHeight }} className='cvat-objects-sidebar-labels-list'>
            { labels.map((label: any): JSX.Element => {
                const statesVisible = annotations
                    .filter((state: any) => state.label.id === label.id)
                    .reduce((acc: boolean, state: any) => acc && state.visible, true);
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
                        onStatesLock={(lock: boolean): void => {
                            const filteredAnnotations = annotations
                                .filter((objectState: any):
                                boolean => objectState.label.id === label.id);
                            const objectStates: any[] = [];
                            const promises: Promise<any>[] = [];
                            for (const objectState of filteredAnnotations) {
                                objectState.lock = lock;
                                objectStates.push(objectState);
                                promises.push(objectState.save());
                            }

                            Promise.all(promises)
                                .then((updatedObjectStates): void => {
                                    for (let i = 0; i < updatedObjectStates.length; i++) {
                                        const objectState = objectStates[i];
                                        const updatedObjectState = updatedObjectStates[i];
                                        const index = annotations.indexOf(objectState);
                                        if (index !== -1) {
                                            annotations[index] = updatedObjectState;
                                        }
                                    }

                                    onAnnotationsUpdated(annotations);
                                });
                        }}
                        onStatesHide={(hide: boolean): void => {
                            const filteredAnnotations = annotations
                                .filter((objectState: any):
                                boolean => objectState.label.id === label.id);
                            const objectStates: any[] = [];
                            const promises: Promise<any>[] = [];
                            for (const objectState of filteredAnnotations) {
                                objectState.visible = !hide;
                                objectStates.push(objectState);
                                promises.push(objectState.save());
                            }

                            Promise.all(promises)
                                .then((updatedObjectStates): void => {
                                    for (let i = 0; i < updatedObjectStates.length; i++) {
                                        const objectState = objectStates[i];
                                        const updatedObjectState = updatedObjectStates[i];
                                        const index = annotations.indexOf(objectState);
                                        if (index !== -1) {
                                            annotations[index] = updatedObjectState;
                                        }
                                    }

                                    onAnnotationsUpdated(annotations);
                                });
                        }}
                    />
                );
            })}
        </div>
    );
}
