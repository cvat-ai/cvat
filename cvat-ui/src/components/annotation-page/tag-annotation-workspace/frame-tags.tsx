// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useState, useEffect } from 'react';
import Tag from 'antd/lib/tag';
import { connect } from 'react-redux';
import { Action } from 'redux';
import { ThunkDispatch } from 'redux-thunk';

import {
    removeObject as removeObjectAction,
} from 'actions/annotation-actions';
import { CombinedState, ObjectType, Workspace } from 'reducers';
import {
    QualityConflict, ObjectState, AnnotationConflict, getCore,
} from 'cvat-core-wrapper';
import { filterAnnotations } from 'utils/filter-annotations';

const core = getCore();

interface StateToProps {
    highlightedConflict: QualityConflict | null;
    states: ObjectState[];
    workspace: Workspace;
}

interface DispatchToProps {
    removeObject(objectState: any): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: { highlightedConflict, states },
            workspace,
        },
    } = state;

    return { highlightedConflict, states, workspace };
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
        highlightedConflict, states, workspace, removeObject,
    } = props;

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
            <div>
                {frameTags
                    .filter((tag: any) => tag.source !== core.enums.Source.GT)
                    .map((tag: any) => (
                        <Tag
                            className={
                                (highlightedConflict?.annotationConflicts || []).filter((conflict: AnnotationConflict) => conflict.serverID === tag.serverID).length !== 0 ? 'cvat-frame-tag-highlighted' : 'cvat-frame-tag'
                            }
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
            </div>
            <div>
                {frameTags
                    .filter((tag: any) => tag.source === core.enums.Source.GT)
                    .map((tag: any) => (
                        <Tag
                            className={
                                (highlightedConflict?.annotationConflicts || []).filter((conflict: AnnotationConflict) => conflict.serverID === tag.serverID).length !== 0 ? 'cvat-frame-tag-highlighted' : 'cvat-frame-tag'
                            }
                            color={tag.label.color}
                            onClose={() => {
                                onRemoveState(tag);
                            }}
                            key={tag.clientID}
                        >
                            {tag.label.name}
                            {' '}
                            (GT)
                        </Tag>
                    ))}
            </div>
        </>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(FrameTags);
