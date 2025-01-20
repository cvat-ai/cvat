// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'react-redux';
import {
    CombinedState, ContextMenuType, NewIssueSource, ShapeType, Workspace,
} from 'reducers';

import CanvasContextMenuComponent from 'components/annotation-page/canvas/views/canvas2d/canvas-context-menu';
import { copyShape, pasteShapeAsync, updateCanvasContextMenu } from 'actions/annotation-actions';
import { reviewActions, finishIssueAsync } from 'actions/review-actions';
import { ThunkDispatch } from 'utils/redux';
import { Canvas } from 'cvat-canvas-wrapper';
import { ObjectState, QualityConflict } from 'cvat-core-wrapper';

interface OwnProps {
    readonly?: boolean;
}

interface StateToProps {
    contextMenuParentID: number | null;
    contextMenuClientID: number | null;
    canvasInstance: Canvas | null;
    objectStates: ObjectState[];
    frameConflicts: QualityConflict[];
    visible: boolean;
    top: number;
    left: number;
    type: ContextMenuType;
    collapsed: boolean | undefined;
    workspace: Workspace;
    latestComments: string[];
    activatedStateID: number | null;
}

interface DispatchToProps {
    onUpdateContextMenu(
        visible: boolean, left: number, top: number,
        pointID: number | null, type?: ContextMenuType,
    ): void;
    onStartIssue(position: number[]): void;
    openIssue(position: number[], message: string): void;
    onCopyObject(objectState: ObjectState): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: { collapsed, states: objectStates, activatedStateID },
            canvas: {
                instance,
                contextMenu: {
                    visible, top, left, type, clientID, parentID,
                },
                ready,
            },
            workspace,
        },
        review: { latestComments, frameConflicts },
    } = state;

    let objectState = objectStates.find((_state: ObjectState) => {
        if (Number.isInteger(parentID)) return _state.clientID === parentID;
        return _state.clientID === clientID;
    });
    if (Number.isInteger(parentID) && objectState) {
        objectState = objectState.elements.find((_state: ObjectState) => _state.clientID === clientID);
    }

    return {
        contextMenuClientID: clientID,
        contextMenuParentID: parentID,
        collapsed: clientID !== null ? collapsed[clientID] : undefined,
        activatedStateID,
        objectStates,
        canvasInstance: instance instanceof Canvas ? instance : null,
        visible:
            clientID !== null &&
            visible &&
            ready &&
            !!objectState,
        left,
        top,
        type,
        workspace,
        latestComments,
        frameConflicts,
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch): DispatchToProps {
    return {
        onUpdateContextMenu(
            visible: boolean, left: number, top: number,
            pointID: number | null, type?: ContextMenuType,
        ): void {
            dispatch(updateCanvasContextMenu(visible, left, top, pointID, type));
        },
        onStartIssue(position: number[]): void {
            dispatch(reviewActions.startIssue(position));
            dispatch(updateCanvasContextMenu(false, 0, 0));
        },
        openIssue(position: number[], message: string): void {
            dispatch(reviewActions.startIssue(position, NewIssueSource.QUICK_ISSUE));
            dispatch(finishIssueAsync(message));
            dispatch(updateCanvasContextMenu(false, 0, 0));
        },
        onCopyObject(objectState: ObjectState): void {
            dispatch(copyShape(objectState));
            dispatch(pasteShapeAsync());
        },
    };
}

type Props = StateToProps & DispatchToProps & OwnProps;

interface State {
    latestLeft: number;
    latestTop: number;
    left: number;
    top: number;
}

class CanvasContextMenuContainer extends React.PureComponent<Props, State> {
    static propTypes = {
        readonly: PropTypes.bool,
    };

    static defaultProps = {
        readonly: false,
    };

    private initialized: HTMLDivElement | null;
    private dragging: boolean;
    private dragInitPosX: number;
    private dragInitPosY: number;

    public constructor(props: Props) {
        super(props);

        this.initialized = null;
        this.dragging = false;
        this.dragInitPosX = 0;
        this.dragInitPosY = 0;
        this.state = {
            latestLeft: 0,
            latestTop: 0,
            left: 0,
            top: 0,
        };
    }

    static getDerivedStateFromProps(props: Readonly<Props>, state: State): State | null {
        if (props.left === state.latestLeft && props.top === state.latestTop) {
            return null;
        }

        return {
            ...state,
            latestLeft: props.left,
            latestTop: props.top,
            top: props.top,
            left: props.left,
        };
    }

    public componentDidMount(): void {
        const { canvasInstance } = this.props;
        this.updatePositionIfOutOfScreen();

        window.addEventListener('mousemove', this.moveContextMenu);
        if (canvasInstance) {
            canvasInstance.html().addEventListener('canvas.clicked', this.onClickCanvas);
            canvasInstance.html().addEventListener('contextmenu', this.onOpenCanvasContextMenu);
            canvasInstance.html().addEventListener('canvas.contextmenu', this.onCanvasPointContextMenu);
        }
    }

    public componentDidUpdate(prevProps: Props): void {
        const { collapsed } = this.props;

        const [element] = window.document.getElementsByClassName('cvat-canvas-context-menu');
        if (collapsed !== prevProps.collapsed && element) {
            element.addEventListener(
                'transitionend',
                () => {
                    this.updatePositionIfOutOfScreen();
                },
                { once: true },
            );
        } else if (element) {
            this.updatePositionIfOutOfScreen();
        }

        if (element && (!this.initialized || this.initialized !== element)) {
            this.initialized = element as HTMLDivElement;

            this.initialized.addEventListener('mousedown', (e: MouseEvent): any => {
                this.dragging = true;
                this.dragInitPosX = e.clientX;
                this.dragInitPosY = e.clientY;
            });

            this.initialized.addEventListener('mouseup', () => {
                this.dragging = false;
            });
        }
    }

    public componentWillUnmount(): void {
        const { canvasInstance } = this.props;
        window.removeEventListener('mousemove', this.moveContextMenu);
        if (canvasInstance) {
            canvasInstance.html().removeEventListener('canvas.clicked', this.onClickCanvas);
            canvasInstance.html().removeEventListener('contextmenu', this.onOpenCanvasContextMenu);
            canvasInstance.html().removeEventListener('canvas.contextmenu', this.onCanvasPointContextMenu);
        }
    }

    private onClickCanvas = (): void => {
        const { visible, onUpdateContextMenu } = this.props;
        if (visible) {
            onUpdateContextMenu(false, 0, 0, null, ContextMenuType.CANVAS_SHAPE);
        }
    };

    private onOpenCanvasContextMenu = (e: MouseEvent): void => {
        const { activatedStateID, onUpdateContextMenu } = this.props;
        if (e.target && !(e.target as HTMLElement).classList.contains('svg_select_points')) {
            onUpdateContextMenu(
                activatedStateID !== null, e.clientX, e.clientY, null, ContextMenuType.CANVAS_SHAPE,
            );
        }
    };

    private onCanvasPointContextMenu = (e: any): void => {
        const { objectStates, activatedStateID, onUpdateContextMenu } = this.props;

        const [state] = objectStates.filter((el: any) => el.clientID === activatedStateID);
        if (![ShapeType.CUBOID, ShapeType.RECTANGLE, ShapeType.MASK].includes(state.shapeType)) {
            onUpdateContextMenu(
                activatedStateID !== null,
                e.detail.mouseEvent.clientX,
                e.detail.mouseEvent.clientY,
                e.detail.pointID,
                ContextMenuType.CANVAS_SHAPE_POINT,
            );
        }
    };

    private moveContextMenu = (e: MouseEvent): void => {
        if (this.dragging) {
            this.setState((state) => {
                const value = {
                    left: state.left + e.clientX - this.dragInitPosX,
                    top: state.top + e.clientY - this.dragInitPosY,
                };

                this.dragInitPosX = e.clientX;
                this.dragInitPosY = e.clientY;

                return value;
            });

            e.preventDefault();
        }
    };

    private updatePositionIfOutOfScreen(): void {
        const { top, left } = this.state;
        const { innerWidth, innerHeight } = window;

        const [element] = window.document.getElementsByClassName('cvat-canvas-context-menu');
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

    public render(): JSX.Element | null {
        const { left, top } = this.state;
        const {
            visible,
            contextMenuClientID,
            contextMenuParentID,
            objectStates,
            frameConflicts,
            type,
            readonly,
            workspace,
            latestComments,
            onStartIssue,
            openIssue,
            onCopyObject,
        } = this.props;

        return (
            type === ContextMenuType.CANVAS_SHAPE ? (
                <CanvasContextMenuComponent
                    contextMenuClientID={contextMenuClientID}
                    contextMenuParentID={contextMenuParentID}
                    readonly={readonly}
                    left={left}
                    top={top}
                    visible={visible}
                    objectStates={objectStates}
                    frameConflicts={frameConflicts}
                    workspace={workspace}
                    latestComments={latestComments}
                    onStartIssue={onStartIssue}
                    openIssue={openIssue}
                    onCopyObject={onCopyObject}
                />
            ) : null
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(CanvasContextMenuContainer);
