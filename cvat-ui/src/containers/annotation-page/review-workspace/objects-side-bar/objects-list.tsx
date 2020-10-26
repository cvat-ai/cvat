// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { GlobalHotKeys, ExtendedKeyMapOptions } from 'react-hotkeys';

import ObjectsListComponent from 'components/annotation-page/review-workspace/objects-side-bar/objects-list';
import {
    updateAnnotationsAsync,
    changeFrameAsync,
    collapseObjectItems,
    changeGroupColorAsync,
} from 'actions/annotation-actions';
import { Canvas } from 'cvat-canvas-wrapper';
import {
    CombinedState, StatesOrdering, ObjectType, ColorBy,
} from 'reducers/interfaces';

interface StateToProps {
    frameNumber: any;
    listHeight: number;
    statesCollapsedAll: boolean;
    collapsedStates: Record<number, boolean>;
    objectStates: any[];
    annotationsFilters: string[];
    colors: string[];
    colorBy: ColorBy;
    activatedStateID: number | null;
    minZLayer: number;
    maxZLayer: number;
    annotationsFiltersHistory: string[];
    keyMap: Record<string, ExtendedKeyMapOptions>;
    canvasInstance: Canvas;
}

interface DispatchToProps {
    updateAnnotations(states: any[]): void;
    collapseStates(states: any[], value: boolean): void;
    changeFrame(frame: number): void;
    changeGroupColor(group: number, color: string): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: {
                states: objectStates,
                filters: annotationsFilters,
                filtersHistory: annotationsFiltersHistory,
                collapsed,
                collapsedAll,
                activatedStateID,
                zLayer: { min: minZLayer, max: maxZLayer },
            },
            player: {
                frame: { number: frameNumber },
            },
            canvas: { instance: canvasInstance },
            tabContentHeight: listHeight,
            colors,
        },
        settings: {
            shapes: { colorBy },
        },
        shortcuts: { keyMap },
    } = state;

    return {
        listHeight,
        statesCollapsedAll: collapsedAll,
        collapsedStates: collapsed,
        objectStates,
        frameNumber,
        annotationsFilters,
        colors,
        colorBy,
        activatedStateID,
        minZLayer,
        maxZLayer,
        annotationsFiltersHistory,
        keyMap,
        canvasInstance,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        updateAnnotations(states: any[]): void {
            dispatch(updateAnnotationsAsync(states));
        },
        collapseStates(states: any[], collapsed: boolean): void {
            dispatch(collapseObjectItems(states, collapsed));
        },
        changeFrame(frame: number): void {
            dispatch(changeFrameAsync(frame));
        },
        changeGroupColor(group: number, color: string): void {
            dispatch(changeGroupColorAsync(group, color));
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

    private onCollapseAllStates = (): void => {
        this.collapseAllStates(true);
    };

    private onExpandAllStates = (): void => {
        this.collapseAllStates(false);
    };

    private collapseAllStates(collapsed: boolean): void {
        const { objectStates, collapseStates } = this.props;

        collapseStates(objectStates, collapsed);
    }

    public render(): JSX.Element {
        const { objectStates, sortedStatesID, statesOrdering } = this.state;
        const {
            activatedStateID,
            keyMap,
            canvasInstance,
            colors,
            colorBy,
            updateAnnotations,
            changeGroupColor,
            changeFrame,
        } = this.props;

        const subKeyMap = {
            NEXT_KEY_FRAME: keyMap.NEXT_KEY_FRAME,
            PREV_KEY_FRAME: keyMap.PREV_KEY_FRAME,
            CHANGE_OBJECT_COLOR: keyMap.CHANGE_OBJECT_COLOR,
        };

        const preventDefault = (event: KeyboardEvent | undefined): void => {
            if (event) {
                event.preventDefault();
            }
        };

        const activatedStated = (): any | null => {
            if (activatedStateID !== null) {
                const [state] = objectStates.filter(
                    (objectState: any): boolean => objectState.clientID === activatedStateID,
                );

                return state || null;
            }

            return null;
        };

        const handlers = {
            CHANGE_OBJECT_COLOR: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state) {
                    if (colorBy === ColorBy.GROUP) {
                        const colorID = (colors.indexOf(state.group.color) + 1) % colors.length;
                        changeGroupColor(state.group.id, colors[colorID]);
                        return;
                    }

                    if (colorBy === ColorBy.INSTANCE) {
                        const colorID = (colors.indexOf(state.color) + 1) % colors.length;
                        state.color = colors[colorID];
                        updateAnnotations([state]);
                    }
                }
            },
            NEXT_KEY_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state && state.objectType === ObjectType.TRACK) {
                    const frame = typeof state.keyframes.next === 'number' ? state.keyframes.next : null;
                    if (frame !== null && canvasInstance.isAbleToChangeFrame()) {
                        changeFrame(frame);
                    }
                }
            },
            PREV_KEY_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const state = activatedStated();
                if (state && state.objectType === ObjectType.TRACK) {
                    const frame = typeof state.keyframes.prev === 'number' ? state.keyframes.prev : null;
                    if (frame !== null && canvasInstance.isAbleToChangeFrame()) {
                        changeFrame(frame);
                    }
                }
            },
        };

        return (
            <>
                <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} allowChanges />
                <ObjectsListComponent
                    {...this.props}
                    statesOrdering={statesOrdering}
                    sortedStatesID={sortedStatesID}
                    objectStates={objectStates}
                    changeStatesOrdering={this.onChangeStatesOrdering}
                    collapseAllStates={this.onCollapseAllStates}
                    expandAllStates={this.onExpandAllStates}
                />
            </>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(ObjectsListContainer);
