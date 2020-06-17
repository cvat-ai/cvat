// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { connect } from 'react-redux';
import { CombinedState, ContextMenuType } from 'reducers/interfaces';

import { updateAnnotationsAsync, updateCanvasContextMenu } from 'actions/annotation-actions';

import CanvasPointContextMenuComponent from 'components/annotation-page/standard-workspace/canvas-point-context-menu';

interface StateToProps {
    activatedStateID: number | null;
    activatedPointID: number | null;
    states: any[];
    visible: boolean;
    top: number;
    left: number;
    type: ContextMenuType;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: {
                states,
                activatedStateID,
            },
            canvas: {
                contextMenu: {
                    visible,
                    top,
                    left,
                    type,
                    pointID: activatedPointID,
                },
            },
        },
    } = state;

    return {
        activatedStateID,
        activatedPointID,
        states,
        visible,
        left,
        top,
        type,
    };
}

interface DispatchToProps {
    onUpdateAnnotations(states: any[]): void;
    onCloseContextMenu(): void;
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onUpdateAnnotations(states: any[]): void {
            dispatch(updateAnnotationsAsync(states));
        },
        onCloseContextMenu(): void {
            dispatch(updateCanvasContextMenu(false, 0, 0));
        },
    };
}

type Props = StateToProps & DispatchToProps;

interface State {
    activatedStateID: number | null;
    activatedPointID: number | null;
    latestLeft: number;
    latestTop: number;
    left: number;
    top: number;
}

class CanvasPointContextMenuContainer extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);

        this.state = {
            activatedStateID: null,
            activatedPointID: null,
            latestLeft: 0,
            latestTop: 0,
            left: 0,
            top: 0,
        };
    }

    static getDerivedStateFromProps(props: Props, state: State): State {
        const newState: State = { ...state };

        if (props.left !== state.latestLeft
            || props.top !== state.latestTop) {
            newState.latestLeft = props.left;
            newState.latestTop = props.top;
            newState.top = props.top;
            newState.left = props.left;
        }

        if (typeof state.activatedStateID !== typeof props.activatedStateID
            || state.activatedPointID !== props.activatedPointID) {
            newState.activatedStateID = props.activatedStateID;
            newState.activatedPointID = props.activatedPointID;
        }


        return newState;
    }

    public componentDidUpdate(): void {
        const {
            top,
            left,
        } = this.state;

        const {
            innerWidth,
            innerHeight,
        } = window;

        const [element] = window.document.getElementsByClassName('cvat-canvas-point-context-menu');
        if (element) {
            const height = element.clientHeight;
            const width = element.clientWidth;

            if (top + height > innerHeight || left + width > innerWidth) {
                this.setState({
                    top: top - Math.max(top + height - innerHeight, 0),
                    left: left - Math.max(left + width - innerWidth, 0),
                });
            }
        }
    }

    private deletePoint(): void {
        const {
            states,
            onUpdateAnnotations,
            onCloseContextMenu,
        } = this.props;

        const {
            activatedStateID,
            activatedPointID,
        } = this.state;

        const [objectState] = states.filter((e) => (e.clientID === activatedStateID));
        if (typeof activatedPointID === 'number') {
            objectState.points = objectState.points.slice(0, activatedPointID * 2)
                .concat(objectState.points.slice(activatedPointID * 2 + 2));
            onUpdateAnnotations([objectState]);
            onCloseContextMenu();
        }
    }

    public render(): JSX.Element {
        const {
            visible,
            activatedStateID,
            type,
        } = this.props;

        const {
            top,
            left,
        } = this.state;

        return (
            <>
                {type === ContextMenuType.CANVAS_SHAPE_POINT && (
                    <CanvasPointContextMenuComponent
                        left={left}
                        top={top}
                        visible={visible}
                        activatedStateID={activatedStateID}
                        onPointDelete={() => this.deletePoint()}
                    />
                )}
            </>
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(CanvasPointContextMenuContainer);
