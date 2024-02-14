// Copyright (C) 2021-2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { Dispatch } from 'react';
import { ObjectState } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import ObjectItemDetails from 'components/annotation-page/standard-workspace/objects-side-bar/object-item-details';
import { AnyAction } from 'redux';
import { updateAnnotationsAsync, collapseObjectItems } from 'actions/annotation-actions';
import { EventScope } from 'cvat-logger';
import { connect } from 'react-redux';

interface OwnProps {
    readonly: boolean;
    clientID: number;
    parentID: number | null;
}

interface StateToProps {
    collapsed: boolean;
    state: ObjectState | null;
    jobInstance: any;
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
            job: {
                instance: jobInstance,
            },
        },
    } = state;

    const collapsed = typeof statesCollapsed[clientID as number] === 'undefined' ? collapsedAll : statesCollapsed[clientID];

    return {
        collapsed,
        state: objectState,
        jobInstance,
    };
}

function mapDispatchToProps(dispatch: Dispatch<AnyAction>): DispatchToProps {
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
        const {
            state, readonly, jobInstance, updateState,
        } = this.props;
        if (!readonly && state) {
            jobInstance.logger.log(EventScope.changeAttribute, {
                id,
                value,
                object_id: state.clientID,
            });
            const attr: Record<number, string> = {};
            attr[id] = value;
            state.attributes = attr;
            updateState(state);
        }
    };

    private collapse = (): void => {
        const { state, collapseOrExpand, collapsed } = this.props;
        collapseOrExpand(state, !collapsed);
    };

    public render(): JSX.Element | null {
        const { readonly, collapsed, state } = this.props;

        if (state) {
            return (
                <ObjectItemDetails
                    readonly={readonly}
                    collapsed={collapsed}
                    collapse={this.collapse}
                    changeAttribute={this.changeAttribute}
                    values={{ ...state.attributes }}
                    attributes={[...state.label.attributes]}
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
