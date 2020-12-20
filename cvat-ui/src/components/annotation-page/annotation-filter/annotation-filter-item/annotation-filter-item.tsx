// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { Tag } from 'antd';
import PropTypes from 'prop-types';
import React, { ReactElement, useReducer } from 'react';
import './annotation-filter-item.scss';

// TODO: DRY
interface State {
    id: string;
    concatenator: string;
    filterBy: string;
    operator: string;
    value: string;
    attribute: string;
    attributeOperator: string;
    attributeValue: string;
    anotherAttributeLabel: string;
    anotherAttributeValue: string;
    left: string[];
    right: string[];
}

interface Props {
    item: State;
    onEdit: Function;
    onDelete: Function;
}

enum ActionType {
    addLeft,
    addRight,
    removeLeft,
    removeRight,
}

const reducer = (state: State, action: { type: ActionType; payload?: any }): State => {
    switch (action.type) {
        case ActionType.addLeft:
            return { ...state, left: [...state.left, '('] };
        case ActionType.addRight:
            return { ...state, right: [...state.right, ')'] };
        case ActionType.removeLeft:
            state.left.pop();
            return { ...state };
        case ActionType.removeRight:
            state.right.pop();
            return { ...state };
        default:
            return state;
    }
};
function AnnotationFilterItem({ item, onEdit, onDelete }: Props): ReactElement {
    const [state, dispatch] = useReducer(reducer, item);

    return (
        <>
            {state.concatenator && ` ${state.concatenator} `}
            <span className='group'>{state.left?.map((leftItem: string) => leftItem)}</span>
            <Tag
                className='annotation-filters-item'
                onClick={(e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
                    e.stopPropagation();
                    if (e.shiftKey) {
                        dispatch({ type: ActionType.addLeft });
                    } else if (e.altKey) {
                        dispatch({ type: ActionType.removeLeft });
                    } else {
                        onEdit(state);
                    }
                }}
                onContextMenu={(e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
                    e.preventDefault();
                    if (e.shiftKey || e.altKey) e.stopPropagation();
                    if (e.shiftKey) {
                        dispatch({ type: ActionType.addRight });
                    } else if (e.altKey) {
                        dispatch({ type: ActionType.removeRight });
                    }
                }}
                onClose={(e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
                    e.preventDefault();
                    onDelete(state);
                }}
                closable
            >
                {!state.attribute && `${state.filterBy}${state.operator}"${state.value}"`}

                {state.attribute &&
                    !state.anotherAttributeLabel &&
                    `attr["${state.attribute}"]${state.attributeOperator}"${state.attributeValue}"`}

                {state.anotherAttributeLabel &&
                    `attr["${state.attribute}"]${state.attributeOperator}attr["${state.anotherAttributeValue}"]`}
            </Tag>
            <span className='group'>{state.right?.map((rightItem: string) => rightItem)}</span>
        </>
    );
}

AnnotationFilterItem.propTypes = {
    item: PropTypes.objectOf(PropTypes.any),
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};

export default AnnotationFilterItem;
