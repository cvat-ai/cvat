// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { GlobalHotKeys, KeyMap } from 'react-hotkeys';

import { SelectValue } from 'antd/lib/select';

import ObjectsListComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-list';
import {
    updateAnnotationsAsync,
    fetchAnnotationsAsync,
    changeAnnotationsFilters as changeAnnotationsFiltersAction,
    collapseObjectItems,
} from 'actions/annotation-actions';

import {
    CombinedState,
    StatesOrdering,
    ObjectType,
} from 'reducers/interfaces';

interface StateToProps {
    jobInstance: any;
    frameNumber: any;
    listHeight: number;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsed: boolean;
    objectStates: any[];
    annotationsFilters: string[];
    activatedStateID: number | null;
}

interface DispatchToProps {
    updateAnnotations(sessionInstance: any, frameNumber: number, states: any[]): void;
    changeAnnotationsFilters(sessionInstance: any, filters: string[]): void;
    collapseStates(states: any[], value: boolean): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: {
                states: objectStates,
                filters: annotationsFilters,
                collapsed,
                activatedStateID,
            },
            job: {
                instance: jobInstance,
            },
            player: {
                frame: {
                    number: frameNumber,
                },
            },
            tabContentHeight: listHeight,
        },
    } = state;

    let statesHidden = true;
    let statesLocked = true;
    let statesCollapsed = true;

    objectStates.forEach((objectState: any) => {
        const { clientID, lock } = objectState;
        if (!lock) {
            statesHidden = statesHidden && objectState.hidden;
            statesLocked = statesLocked && objectState.lock;
        }
        const stateCollapsed = clientID in collapsed ? collapsed[clientID] : true;
        statesCollapsed = statesCollapsed && stateCollapsed;
    });

    return {
        listHeight,
        statesHidden,
        statesLocked,
        statesCollapsed,
        objectStates,
        frameNumber,
        jobInstance,
        annotationsFilters,
        activatedStateID,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        updateAnnotations(sessionInstance: any, frameNumber: number, states: any[]): void {
            dispatch(updateAnnotationsAsync(sessionInstance, frameNumber, states));
        },
        collapseStates(states: any[], collapsed: boolean): void {
            dispatch(collapseObjectItems(states, collapsed));
        },
        changeAnnotationsFilters(
            sessionInstance: any,
            filters: string[],
        ): void {
            dispatch(changeAnnotationsFiltersAction(filters));
            dispatch(fetchAnnotationsAsync(sessionInstance));
        },
    };
}

function sortAndMap(objectStates: any[], ordering: StatesOrdering): number[] {
    let sorted = [];
    if (ordering === StatesOrdering.ID_ASCENT) {
        sorted = [...objectStates].sort((a: any, b: any): number => a.clientID - b.clientID);
    } else if (ordering === StatesOrdering.ID_DESCENT) {
        sorted = [...objectStates].sort((a: any, b: any): number => b.clientID - a.clientID);
    } else {
        sorted = [...objectStates].sort((a: any, b: any): number => b.updated - a.updated);
    }

    return sorted.map((state: any) => state.clientID);
}

type Props = StateToProps & DispatchToProps;

interface State {
    statesOrdering: StatesOrdering;
    objectStates: any[];
    sortedStatesID: number[];
}

class ObjectsListContainer extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            statesOrdering: StatesOrdering.ID_ASCENT,
            objectStates: [],
            sortedStatesID: [],
        };
    }

    static getDerivedStateFromProps(props: Props, state: State): State | null {
        if (props.objectStates === state.objectStates) {
            return null;
        }

        return {
            ...state,
            objectStates: props.objectStates,
            sortedStatesID: sortAndMap(props.objectStates, state.statesOrdering),
        };
    }

    private onChangeStatesOrdering = (statesOrdering: StatesOrdering): void => {
        const { objectStates } = this.props;
        this.setState({
            statesOrdering,
            sortedStatesID: sortAndMap(objectStates, statesOrdering),
        });
    };

    private onChangeAnnotationsFilters = (value: SelectValue): void => {
        const {
            jobInstance,
            changeAnnotationsFilters,
        } = this.props;
        const filters = value as string[];
        changeAnnotationsFilters(jobInstance, filters);
    };

    private onLockAllStates = (): void => {
        this.lockAllStates(true);
    };

    private onUnlockAllStates = (): void => {
        this.lockAllStates(false);
    };

    private onCollapseAllStates = (): void => {
        this.collapseAllStates(true);
    };

    private onExpandAllStates = (): void => {
        this.collapseAllStates(false);
    };

    private onHideAllStates = (): void => {
        this.hideAllStates(true);
    };

    private onShowAllStates = (): void => {
        this.hideAllStates(false);
    };

    private lockAllStates(locked: boolean): void {
        const {
            objectStates,
            updateAnnotations,
            jobInstance,
            frameNumber,
        } = this.props;
        for (const objectState of objectStates) {
            objectState.lock = locked;
        }

        updateAnnotations(jobInstance, frameNumber, objectStates);
    }

    private hideAllStates(hidden: boolean): void {
        const {
            objectStates,
            updateAnnotations,
            jobInstance,
            frameNumber,
        } = this.props;
        for (const objectState of objectStates) {
            objectState.hidden = hidden;
        }

        updateAnnotations(jobInstance, frameNumber, objectStates);
    }

    private collapseAllStates(collapsed: boolean): void {
        const {
            objectStates,
            collapseStates,
        } = this.props;

        collapseStates(objectStates, collapsed);
    }

    public render(): JSX.Element {
        const {
            annotationsFilters,
            statesHidden,
            statesLocked,
            activatedStateID,
            objectStates,
            frameNumber,
            jobInstance,
            updateAnnotations,
        } = this.props;
        const {
            sortedStatesID,
            statesOrdering,
        } = this.state;

        const keyMap = {
            SWITCH_ALL_LOCK: {
                name: 'Lock/unlock all objects',
                description: 'Change locked state for all objects in the side bar',
                sequence: 't+l',
                action: 'keydown',
            },
            SWITCH_LOCK: {
                name: 'Lock/unlock an object',
                description: 'Change locked state for an active object',
                sequence: 'l',
                action: 'keydown',
            },
            SWITCH_ALL_HIDDEN: {
                name: 'Hide/show all objects',
                description: 'Change hidden state for objects in the side bar',
                sequence: 't+h',
                action: 'keydown',
            },
            SWITCH_HIDDEN: {
                name: 'Hide/show an object',
                description: 'Change hidden state for an active object',
                sequence: 'h',
                action: 'keydown',
            },
            SWITCH_OCCLUDED: {
                name: 'Switch occluded',
                description: 'Change occluded property for an active object',
                sequences: ['q', '/'],
                action: 'keydown',
            },
            SWITCH_KEYFRAME: {
                name: 'Switch keyframe',
                description: 'Change keyframe property for an active track',
                sequences: ['k'],
                action: 'keydown',
            },
            SWITCH_OUTSIDE: {
                name: 'Switch outside',
                description: 'Change outside property for an active track',
                sequences: ['o'],
                action: 'keydown',
            },
        };

        const preventDefault = (event: KeyboardEvent | undefined): void => {
            if (event) {
                event.preventDefault();
            }
        };

        const activatedStated = (): any | null => {
            if (activatedStateID !== null) {
                const [state] = objectStates
                    .filter((objectState: any): boolean => (
                        objectState.clientID === activatedStateID
                    ));

                return state || null;
            }

            return null;
        };

        const handlers = {
            SWITCH_ALL_LOCK: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                this.lockAllStates(!statesLocked);
            },
            SWITCH_LOCK: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state) {
                    state.lock = !state.lock;
                    updateAnnotations(jobInstance, frameNumber, [state]);
                }
            },
            SWITCH_ALL_HIDDEN: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                this.hideAllStates(!statesHidden);
            },
            SWITCH_HIDDEN: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state) {
                    state.hidden = !state.hidden;
                    updateAnnotations(jobInstance, frameNumber, [state]);
                }
            },
            SWITCH_OCCLUDED: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state && state.objectType !== ObjectType.TAG) {
                    state.occluded = !state.occluded;
                    updateAnnotations(jobInstance, frameNumber, [state]);
                }
            },
            SWITCH_KEYFRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state && state.objectType === ObjectType.TRACK) {
                    state.keyframe = !state.keyframe;
                    updateAnnotations(jobInstance, frameNumber, [state]);
                }
            },
            SWITCH_OUTSIDE: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state && state.objectType === ObjectType.TRACK) {
                    state.outside = !state.outside;
                    updateAnnotations(jobInstance, frameNumber, [state]);
                }
            },
        };

        return (
            <GlobalHotKeys keyMap={keyMap as any as KeyMap} handlers={handlers} allowChanges>
                <ObjectsListComponent
                    {...this.props}
                    statesOrdering={statesOrdering}
                    sortedStatesID={sortedStatesID}
                    annotationsFilters={annotationsFilters}
                    changeStatesOrdering={this.onChangeStatesOrdering}
                    changeAnnotationsFilters={this.onChangeAnnotationsFilters}
                    lockAllStates={this.onLockAllStates}
                    unlockAllStates={this.onUnlockAllStates}
                    collapseAllStates={this.onCollapseAllStates}
                    expandAllStates={this.onExpandAllStates}
                    hideAllStates={this.onHideAllStates}
                    showAllStates={this.onShowAllStates}
                />
            </GlobalHotKeys>
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ObjectsListContainer);
