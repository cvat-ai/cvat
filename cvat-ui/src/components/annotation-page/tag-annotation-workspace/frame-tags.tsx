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
import { CombinedState, ObjectType } from 'reducers';
import { ObjectState } from 'cvat-core-wrapper';

interface StateToProps {
    states: ObjectState[];
    statesSources: number[];
}

interface DispatchToProps {
    removeObject(objectState: any): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: { states, statesSources },
        },
    } = state;

    return {
        states,
        statesSources,
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch<CombinedState, {}, Action>): DispatchToProps {
    return {
        removeObject(objectState: ObjectState): void {
            dispatch(removeObjectAction(objectState, false));
        },
    };
}

function FrameTags(props: StateToProps & DispatchToProps): JSX.Element {
    const {
        states,
        statesSources,
        removeObject,
    } = props;

    const [frameTags, setFrameTags] = useState([] as ObjectState[]);

    const onRemoveState = (objectState: ObjectState): void => {
        removeObject(objectState);
    };

    useEffect(() => {
        setFrameTags(
            states.filter(
                (objectState: ObjectState): boolean => (
                    objectState.objectType === ObjectType.TAG &&
                    (!objectState.jobID || statesSources.includes(objectState.jobID))
                ),
            ),
        );
    }, [states, statesSources]);

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
