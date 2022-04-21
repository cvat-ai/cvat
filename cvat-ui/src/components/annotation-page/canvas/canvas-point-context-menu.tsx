// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import Button from 'antd/lib/button';
import { DeleteOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { connect } from 'react-redux';

import { CombinedState, ContextMenuType } from 'reducers/interfaces';
import { updateAnnotationsAsync, updateCanvasContextMenu } from 'actions/annotation-actions';
import CVATTooltip from 'components/common/cvat-tooltip';

interface StateToProps {
    activatedState: any | null;
    selectedPoint: number | null;
    visible: boolean;
    top: number;
    left: number;
    type: ContextMenuType;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: { states, activatedStateID },
            canvas: {
                contextMenu: {
                    visible, top, left, type, pointID: selectedPoint,
                },
            },
        },
    } = state;

    return {
        activatedState:
            activatedStateID === null ?
                null :
                states.filter((_state) => _state.clientID === activatedStateID)[0] || null,
        selectedPoint,
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

function CanvasPointContextMenu(props: Props): React.ReactPortal | null {
    const {
        onCloseContextMenu, onUpdateAnnotations, activatedState, visible, type, top, left,
    } = props;

    const [contextMenuFor, setContextMenuFor] = useState(activatedState);

    if (activatedState !== contextMenuFor) {
        setContextMenuFor(activatedState);
        if (visible && type === ContextMenuType.CANVAS_SHAPE_POINT) {
            onCloseContextMenu();
        }
    }

    const onPointDelete = (): void => {
        const { selectedPoint } = props;
        if (contextMenuFor && selectedPoint !== null) {
            contextMenuFor.points = contextMenuFor.points
                .slice(0, selectedPoint * 2)
                .concat(contextMenuFor.points.slice(selectedPoint * 2 + 2));
            onUpdateAnnotations([contextMenuFor]);
            onCloseContextMenu();
        }
    };

    const onSetStartPoint = (): void => {
        const { selectedPoint } = props;
        if (contextMenuFor && selectedPoint !== null && contextMenuFor.shapeType === 'polygon') {
            contextMenuFor.points = contextMenuFor.points
                .slice(selectedPoint * 2)
                .concat(contextMenuFor.points.slice(0, selectedPoint * 2));
            onUpdateAnnotations([contextMenuFor]);
            onCloseContextMenu();
        }
    };

    return visible && contextMenuFor && type === ContextMenuType.CANVAS_SHAPE_POINT ?
        ReactDOM.createPortal(
            <div className='cvat-canvas-point-context-menu' style={{ top, left }}>
                <CVATTooltip title='Delete point [Alt + dblclick]'>
                    <Button type='link' icon={<DeleteOutlined />} onClick={onPointDelete}>
                        Delete point
                    </Button>
                </CVATTooltip>
                {contextMenuFor && contextMenuFor.shapeType === 'polygon' && (
                    <Button type='link' icon={<EnvironmentOutlined />} onClick={onSetStartPoint}>
                        Set start point
                    </Button>
                )}
            </div>,
            window.document.body,
        ) :
        null;
}

export default connect(mapStateToProps, mapDispatchToProps)(CanvasPointContextMenu);
