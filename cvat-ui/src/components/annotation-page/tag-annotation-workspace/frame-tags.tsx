// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import Tag from 'antd/lib/tag';
import { connect } from 'react-redux';
import { Action } from 'redux';
import { ThunkDispatch } from 'redux-thunk';

import {
    removeObjects as removeObjectsAction,
} from 'actions/annotation-actions';
import { CombinedState, ObjectType } from 'reducers';
import ObjectState from 'cvat-core/src/object-state';

interface StateToProps {
    states: any[];
}

interface DispatchToProps {
    removeObjects(objectStates: ObjectState[]): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: { states },
        },
    } = state;

    return {
        states,
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch<CombinedState, Record<string, never>, Action>): DispatchToProps {
    return {
        removeObjects(objectStates: ObjectState[]): void {
            dispatch(removeObjectsAction(objectStates, false));
        },
    };
}

function FrameTags(props: StateToProps & DispatchToProps): JSX.Element {
    const {
        states,
        removeObjects,
    } = props;

    const [frameTags, setFrameTags] = useState([] as any[]);

    const onRemoveState = (objectState: any): void => {
        removeObjects([objectState]);
    };

    useEffect(() => {
        setFrameTags(states.filter((objectState: any): boolean => objectState.objectType === ObjectType.TAG));
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
