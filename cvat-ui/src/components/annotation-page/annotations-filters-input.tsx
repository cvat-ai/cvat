// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import Select, { SelectValue, LabeledValue } from 'antd/lib/select';
import Icon from 'antd/lib/icon';

import {
    changeAnnotationsFilters as changeAnnotationsFiltersAction,
    fetchAnnotationsAsync,
} from 'actions/annotation-actions';
import { CombinedState } from 'reducers/interfaces';

interface StateToProps {
    annotationsFilters: string[];
    annotationsFiltersHistory: string[];
}

interface DispatchToProps {
    changeAnnotationsFilters(value: SelectValue): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: {
                filters: annotationsFilters,
                filtersHistory: annotationsFiltersHistory,
            },
        },
    } = state;

    return {
        annotationsFilters,
        annotationsFiltersHistory,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        changeAnnotationsFilters(value: SelectValue) {
            if (typeof (value) === 'string') {
                dispatch(changeAnnotationsFiltersAction([value]));
                dispatch(fetchAnnotationsAsync());
            } else if (Array.isArray(value)
                && value.every((element: string | number | LabeledValue): boolean => (
                    typeof (element) === 'string'
                ))
            ) {
                dispatch(changeAnnotationsFiltersAction(value as string[]));
                dispatch(fetchAnnotationsAsync());
            }
        },
    };
}

function AnnotationsFiltersInput(props: StateToProps & DispatchToProps): JSX.Element {
    const {
        annotationsFilters,
        annotationsFiltersHistory,
        changeAnnotationsFilters,
    } = props;

    return (
        <Select
            className='cvat-annotations-filters-input'
            allowClear
            value={annotationsFilters}
            mode='tags'
            style={{ width: '100%' }}
            placeholder={(
                <>
                    <Icon type='filter' />
                    <span style={{ marginLeft: 5 }}>Annotations filter</span>
                </>
            )}
            onChange={changeAnnotationsFilters}
        >
            {annotationsFiltersHistory.map((element: string): JSX.Element => (
                <Select.Option key={element} value={element}>{element}</Select.Option>
            ))}
        </Select>
    );
}


export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(AnnotationsFiltersInput);
