// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { connect } from 'react-redux';
import { CombinedState } from 'reducers/interfaces';

import CanvasContextMenuComponent from 'components/annotation-page/standard-workspace/canvas-context-menu';

interface StateToProps {
    activatedStateID: number | null;
    visible: boolean;
    top: number;
    left: number;
    collapsed: boolean | undefined;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: {
                activatedStateID,
                collapsed,
            },
            canvas: {
                contextMenu: {
                    visible,
                    top,
                    left,
                },
            },
        },
    } = state;

    return {
        activatedStateID,
        collapsed: activatedStateID !== null ? collapsed[activatedStateID] : undefined,
        visible,
        left,
        top,
    };
}

type Props = StateToProps;

interface State {
    latestLeft: number;
    latestTop: number;
    left: number;
    top: number;
}

class CanvasContextMenuContainer extends React.PureComponent<Props, State> {
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

    static getDerivedStateFromProps(props: Props, state: State): State | null {
        if (props.left === state.latestLeft
            && props.top === state.latestTop) {
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
        this.updatePositionIfOutOfScreen();
        window.addEventListener('mousemove', this.moveContextMenu);
    }

    public componentDidUpdate(prevProps: Props): void {
        const { collapsed } = this.props;

        const [element] = window.document.getElementsByClassName('cvat-canvas-context-menu');
        if (collapsed !== prevProps.collapsed && element) {
            element.addEventListener('transitionend', () => {
                this.updatePositionIfOutOfScreen();
            }, { once: true });
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
        window.removeEventListener('mousemove', this.moveContextMenu);
    }

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
        const {
            top,
            left,
        } = this.state;

        const {
            innerWidth,
            innerHeight,
        } = window;

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

    public render(): JSX.Element {
        const {
            left,
            top,
        } = this.state;

        const {
            visible,
            activatedStateID,
        } = this.props;

        return (
            <CanvasContextMenuComponent
                left={left}
                top={top}
                visible={visible}
                activatedStateID={activatedStateID}
            />
        );
    }
}

export default connect(
    mapStateToProps,
)(CanvasContextMenuContainer);
