// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import Tag from 'antd/lib/tag';
import { connect } from 'react-redux';
import { Action } from 'redux';
import { ThunkDispatch } from 'redux-thunk';

import {
    removeObject as removeObjectAction,
} from 'actions/annotation-actions';
import { CombinedState, ObjectType, Workspace } from 'reducers';
import { ObjectState } from 'cvat-core-wrapper';
import { filterAnnotations } from 'utils/filter-annotations';

interface StateToProps {
    states: ObjectState[];
    workspace: Workspace;
}

interface DispatchToProps {
    removeObject(objectState: any): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: { states },
            workspace,
        },
    } = state;

    return { states, workspace };
}

function mapDispatchToProps(dispatch: ThunkDispatch<CombinedState, {}, Action>): DispatchToProps {
    return {
        removeObject(objectState: ObjectState): void {
            dispatch(removeObjectAction(objectState, false));
        },
    };
}

function FrameTags(props: StateToProps & DispatchToProps): JSX.Element {
    const { states, workspace, removeObject } = props;

    const [frameTags, setFrameTags] = useState([] as ObjectState[]);

    const onRemoveState = (objectState: ObjectState): void => {
        removeObject(objectState);
    };

    useEffect(() => {
        setFrameTags(
            filterAnnotations(states, { workspace, include: [ObjectType.TAG] }),
        );
    }, [states]);

    return (
        <>
            {frameTags.map((tag: any) => (
                <Tag
                    className='cvat-frame-tag'
                    color={tag.label.color}
                    onClose={() => {
                        onRemoveState(tag);
                    }}
                    key={tag.clientID}
                    closable
                >
                    {tag.label.name}
                </Tag>
            ))}
        </>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(FrameTags);
