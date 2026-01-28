// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { ObjectState, ShapeType } from 'cvat-core-wrapper';
import { CombinedState, Workspace } from 'reducers';
import ObjectItemDetails, { SizeType } from 'components/annotation-page/standard-workspace/objects-side-bar/object-item-details';
import { updateAnnotationsAsync, collapseObjectItems } from 'actions/annotation-actions';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'utils/redux';

interface OwnProps {
    readonly: boolean;
    clientID: number;
    parentID: number | null;
}

interface StateToProps {
    collapsed: boolean;
    state: ObjectState | null;
    workspace: Workspace;
}

interface DispatchToProps {
    updateState(objectState: any): void;
    collapseOrExpand(objectState: any, collapsed: boolean): void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const { clientID, parentID } = own;
    let objectState: ObjectState | null = null;
    const { states } = state.annotation.annotations;
    if (parentID) {
        const parentState = (states as ObjectState[])
            .find((_objectState: ObjectState) => _objectState.clientID === parentID);
        if (parentState) {
            objectState = parentState.elements.find((el: ObjectState) => el.clientID === clientID) || null;
        }
    } else {
        objectState = (states as ObjectState[]).find((el: ObjectState) => el.clientID === clientID) || null;
    }

    const {
        annotation: {
            annotations: {
                collapsedAll,
                collapsed: statesCollapsed,
            },
            workspace,
        },
    } = state;

    const collapsed = typeof statesCollapsed[clientID as number] === 'undefined' ? collapsedAll : statesCollapsed[clientID];

    return {
        collapsed,
        state: objectState,
        workspace,
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch): DispatchToProps {
    return {
        updateState(state: ObjectState): void {
            dispatch(updateAnnotationsAsync([state]));
        },
        collapseOrExpand(objectState: ObjectState, collapsed: boolean): void {
            dispatch(collapseObjectItems([objectState], collapsed));
        },
    };
}

type Props = StateToProps & DispatchToProps & OwnProps;

class ObjectItemDetailsContainer extends React.PureComponent<Props> {
    private changeAttribute = (id: number, value: string): void => {
        const { state, readonly, updateState } = this.props;
        if (!readonly && state) {
            const attr: Record<number, string> = {};
            attr[id] = value;
            state.attributes = attr;
            updateState(state);
        }
    };

    private changeSize = (type: SizeType, value: number): void => {
        const { state, readonly, updateState } = this.props;
        if (!readonly && state) {
            if (state.shapeType === ShapeType.CUBOID && state.points) {
                const points = state.points.slice();
                switch (type) {
                    case SizeType.WIDTH:
                        points[6] = value;
                        break;
                    case SizeType.HEIGHT:
                        points[7] = value;
                        break;
                    case SizeType.LENGTH:
                        points[8] = value;
                        break;
                    default:
                        break;
                }
                state.points = points;
            }
            updateState(state);
        }
    };

    private collapse = (): void => {
        const { state, collapseOrExpand, collapsed } = this.props;
        collapseOrExpand(state, !collapsed);
    };

    public render(): JSX.Element | null {
        const {
            readonly, collapsed, state, workspace,
        } = this.props;

        if (state) {
            let sizeParams = null;

            if (state.shapeType === ShapeType.CUBOID && workspace === Workspace.STANDARD3D && state.points) {
                sizeParams = {
                    width: parseFloat(state.points[6].toFixed(2)), // X
                    height: parseFloat(state.points[7].toFixed(2)), // Y
                    length: parseFloat(state.points[8].toFixed(2)), // Z
                };
            }

            return (
                <ObjectItemDetails
                    readonly={readonly}
                    collapsed={collapsed}
                    collapse={this.collapse}
                    changeAttribute={this.changeAttribute}
                    values={{ ...state.attributes }}
                    attributes={[...state.label.attributes]}
                    changeSize={this.changeSize}
                    sizeParams={sizeParams}
                />
            );
        }

        return null;
    }
}

export default connect<StateToProps, DispatchToProps, OwnProps, CombinedState>(
    mapStateToProps,
    mapDispatchToProps,
)(ObjectItemDetailsContainer);
