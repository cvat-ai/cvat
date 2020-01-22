import React from 'react';

import Header, { SortingMethods } from './objects-list-header';
import ObjectItem from './object-item';

interface Props {
    annotations: any[];
    labels: any[];
    listHeight: number;
    onAnnotationsUpdated(annotations: any[]): void;
}

interface State {
    itemCollapseStatuses: Record<number, boolean>;
    sortingMethod: SortingMethods;
}

export default class ObjectsList extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            itemCollapseStatuses: {},
            sortingMethod: SortingMethods.ID_ASCENT,
        };
    }

    private onChangeSortingMethod = (value: SortingMethods): void => {
        this.setState({
            sortingMethod: value,
        });
    };

    private onStatesHide = async (value: boolean): Promise<void> => {
        const {
            annotations,
            onAnnotationsUpdated,
        } = this.props;
        const promises = [];
        for (const state of annotations) {
            state.visible = !value;
            promises.push(state.save());
        }

        const updatedAnnotations = await Promise.all(promises);
        onAnnotationsUpdated(updatedAnnotations);
    };

    private onStatesLock = async (value: boolean): Promise<void> => {
        const {
            annotations,
            onAnnotationsUpdated,
        } = this.props;
        const promises = [];
        for (const state of annotations) {
            state.lock = value;
            promises.push(state.save());
        }

        const updatedAnnotations = await Promise.all(promises);
        onAnnotationsUpdated(updatedAnnotations);
    };

    private onStatesCollapse = (value: boolean): void => {
        const { itemCollapseStatuses } = this.state;
        const updatedItemCollapseStatuses = {
            ...itemCollapseStatuses,
        };

        for (const key of Object.keys(updatedItemCollapseStatuses)) {
            updatedItemCollapseStatuses[+key] = value;
        }

        this.setState({
            itemCollapseStatuses: updatedItemCollapseStatuses,
        });
    };

    private onStateCollapse = (clientID: number, key: string | string[]): void => {
        const { itemCollapseStatuses } = this.state;
        const collapsedItem = key !== 'details' && !key.includes('details');

        const updatedItemCollapseStatuses = {
            ...itemCollapseStatuses,
        };
        updatedItemCollapseStatuses[clientID] = collapsedItem;

        this.setState({
            itemCollapseStatuses: updatedItemCollapseStatuses,
        });
    };

    private onStateUpdate = (state: any): void => {
        const {
            annotations,
            onAnnotationsUpdated,
        } = this.props;

        state.save().then((updatedState: any) => {
            const indexOf = annotations.indexOf(state);
            if (indexOf !== -1) {
                const updatedAnnotations = [...annotations];
                updatedAnnotations[indexOf] = updatedState;
                onAnnotationsUpdated(updatedAnnotations);
            }
        });
    };

    static getDerivedStateFromProps(props: Props, state: State): State | null {
        const updateditemCollapseStatuses = { ...state.itemCollapseStatuses };

        const clientIdxs = [];
        for (const objectState of props.annotations) {
            clientIdxs.push(objectState.clientID);
            if (!(objectState.clientID in updateditemCollapseStatuses)) {
                updateditemCollapseStatuses[objectState.clientID] = true;
            }
        }

        for (const key of Object.keys(updateditemCollapseStatuses)) {
            if (!clientIdxs.includes(+key)) {
                delete updateditemCollapseStatuses[+key];
            }
        }

        return {
            ...state,
            itemCollapseStatuses: updateditemCollapseStatuses,
        };
    }

    public render(): JSX.Element {
        const {
            annotations,
            labels,
            listHeight,
        } = this.props;

        const {
            itemCollapseStatuses,
            sortingMethod,
        } = this.state;

        const statesVisible = annotations
            .reduce((acc: boolean, state: any) => acc && state.visible, true);
        const statesLocked = annotations
            .reduce((acc: boolean, state: any) => acc && state.lock, true);
        const statesExpanded = Object.keys(itemCollapseStatuses)
            .reduce((acc: boolean, key: string) => acc && !itemCollapseStatuses[+key], true);

        let sorted = [];
        if (sortingMethod === SortingMethods.ID_ASCENT) {
            sorted = [...annotations].sort((a: any, b: any): number => a.clientID - b.clientID);
        } else if (sortingMethod === SortingMethods.ID_DESCENT) {
            sorted = [...annotations].sort((a: any, b: any): number => b.clientID - a.clientID);
        } else {
            sorted = [...annotations].sort((a: any, b: any): number => b.updated - a.updated);
        }

        return (
            <div style={{ height: listHeight }}>
                <Header
                    statesVisible={statesVisible}
                    statesLocked={statesLocked}
                    statesExpanded={statesExpanded}
                    sortingMethod={sortingMethod}
                    onChangeSortingMethod={this.onChangeSortingMethod}
                    onStatesLock={this.onStatesLock}
                    onStatesCollapse={this.onStatesCollapse}
                    onStatesHide={this.onStatesHide}
                />
                <div className='cvat-objects-sidebar-states-list'>
                    { sorted.map((objectState: any): JSX.Element => (
                        <ObjectItem
                            key={objectState.clientID}
                            objectState={objectState}
                            labels={labels}
                            collapsed={itemCollapseStatuses[objectState.clientID]}
                            onCollapse={this.onStateCollapse}
                            onUpdate={this.onStateUpdate}
                        />
                    ))}
                </div>
            </div>
        );
    }
}
