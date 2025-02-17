// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useState, useEffect, useCallback } from 'react';
import Tag from 'antd/lib/tag';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';

import {
    removeObject as removeObjectAction,
} from 'actions/annotation-actions';
import { CombinedState, ObjectType } from 'reducers';
import { ObjectState, AnnotationConflict } from 'cvat-core-wrapper';
import { filterAnnotations } from 'utils/filter-annotations';

function FrameTags(): JSX.Element {
    const dispatch = useDispatch();

    const { highlightedConflict, states, workspace } = useSelector((state: CombinedState) => ({
        highlightedConflict: state.annotation.annotations.highlightedConflict,
        states: state.annotation.annotations.states,
        workspace: state.annotation.workspace,
    }), shallowEqual);

    const [frameTags, setFrameTags] = useState<ObjectState[]>([]);

    const onRemoveState = (objectState: ObjectState): void => {
        dispatch(removeObjectAction(objectState, false));
    };

    useEffect(() => {
        setFrameTags(
            filterAnnotations(states, { workspace, include: [ObjectType.TAG] }),
        );
    }, [states]);

    const tagClassName = useCallback((tag: ObjectState): string => {
        const tagHighlighted = (highlightedConflict?.annotationConflicts || [])
            .find((conflict: AnnotationConflict) => conflict.serverID === tag.serverID);
        return tagHighlighted ? 'cvat-frame-tag-highlighted' : 'cvat-frame-tag';
    }, [highlightedConflict]);

    return (
        <>
            <div className='cvat-canvas-annotation-frame-tags'>
                {frameTags
                    .filter((tag: ObjectState) => !tag.isGroundTruth)
                    .map((tag: ObjectState) => (
                        <Tag
                            className={tagClassName(tag)}
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
            <div className='cvat-canvas-ground-truth-frame-tags'>
                {frameTags
                    .filter((tag: ObjectState) => tag.isGroundTruth)
                    .map((tag: ObjectState) => (
                        <Tag
                            className={tagClassName(tag)}
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

export default React.memo(FrameTags);
