// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { connect } from 'react-redux';
import Select, { SelectValue, LabeledValue } from 'antd/lib/select';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import Paragraph from 'antd/lib/typography/Paragraph';
import Tooltip from 'antd/lib/tooltip';
import Modal from 'antd/lib/modal';
import Icon from 'antd/lib/icon';

import {
    changeAnnotationsFilters as changeAnnotationsFiltersAction,
    fetchAnnotationsAsync,
} from 'actions/annotation-actions';
import { CombinedState } from 'reducers/interfaces';

interface StateToProps {
    annotationsFilters: string[];
    annotationsFiltersHistory: string[];
    searchForwardShortcut: string;
    searchBackwardShortcut: string;
}

interface DispatchToProps {
    changeAnnotationsFilters(value: SelectValue): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: { filters: annotationsFilters, filtersHistory: annotationsFiltersHistory },
        },
        shortcuts: { normalizedKeyMap },
    } = state;

    return {
        annotationsFilters,
        annotationsFiltersHistory,
        searchForwardShortcut: normalizedKeyMap.SEARCH_FORWARD,
        searchBackwardShortcut: normalizedKeyMap.SEARCH_BACKWARD,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        changeAnnotationsFilters(value: SelectValue) {
            if (typeof value === 'string') {
                dispatch(changeAnnotationsFiltersAction([value]));
                dispatch(fetchAnnotationsAsync());
            } else if (
                Array.isArray(value) &&
                value.every((element: string | number | LabeledValue): boolean => typeof element === 'string')
            ) {
                dispatch(changeAnnotationsFiltersAction(value as string[]));
                dispatch(fetchAnnotationsAsync());
            }
        },
    };
}

function filtersHelpModalContent(searchForwardShortcut: string, searchBackwardShortcut: string): JSX.Element {
    return (
        <>
            <Paragraph>
                <Title level={3}>General</Title>
            </Paragraph>
            <Paragraph>
                You can use filters to display only subset of objects on a frame or to search objects that satisfy the
                filters using hotkeys
                <Text strong>{` ${searchForwardShortcut} `}</Text>
                and
                <Text strong>{` ${searchBackwardShortcut} `}</Text>
            </Paragraph>
            <Paragraph>
                <Text strong>Supported properties: </Text>
                width, height, label, serverID, clientID, type, shape, occluded
                <br />
                <Text strong>Supported operators: </Text>
                ==, !=, &gt;, &gt;=, &lt;, &lt;=, (), &amp; and |
                <br />
                <Text strong>
                    If you have double quotes in your query string, please escape them using back slash: \&quot; (see
                    the latest example)
                </Text>
                <br />
                All properties and values are case-sensitive. CVAT uses json queries to perform search.
            </Paragraph>
            <Paragraph>
                <Title level={3}>Examples</Title>
                <ul>
                    <li>label==&quot;car&quot; | label==[&quot;road sign&quot;]</li>
                    <li>shape == &quot;polygon&quot;</li>
                    <li>width &gt;= height</li>
                    <li>attr[&quot;Attribute 1&quot;] == attr[&quot;Attribute 2&quot;]</li>
                    <li>clientID == 50</li>
                    <li>
                        (label==&quot;car&quot; &amp; attr[&quot;parked&quot;]==true) | (label==&quot;pedestrian&quot;
                        &amp; width &gt; 150)
                    </li>
                    <li>
                        (( label==[&quot;car \&quot;mazda\&quot;&quot;]) &amp; (attr[&quot;sunglasses&quot;]==true |
                        (width &gt; 150 | height &gt; 150 &amp; (clientID == serverID)))))
                    </li>
                </ul>
            </Paragraph>
        </>
    );
}

function AnnotationsFiltersInput(props: StateToProps & DispatchToProps): JSX.Element {
    const {
        annotationsFilters,
        annotationsFiltersHistory,
        searchForwardShortcut,
        searchBackwardShortcut,
        changeAnnotationsFilters,
    } = props;

    const [underCursor, setUnderCursor] = useState(false);

    return (
        <Select
            className='cvat-annotations-filters-input'
            allowClear
            value={annotationsFilters}
            mode='tags'
            style={{ width: '100%' }}
            placeholder={
                underCursor ? (
                    <>
                        <Tooltip title='Click to open help' mouseLeaveDelay={0}>
                            <Icon
                                type='filter'
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    Modal.info({
                                        width: 700,
                                        title: 'How to use filters?',
                                        content: filtersHelpModalContent(searchForwardShortcut, searchBackwardShortcut),
                                    });
                                }}
                            />
                        </Tooltip>
                    </>
                ) : (
                    <>
                        <Icon style={{ transform: 'scale(0.9)' }} type='filter' />
                        <span style={{ marginLeft: 5 }}>Annotations filters</span>
                    </>
                )
            }
            onChange={changeAnnotationsFilters}
            onMouseEnter={() => setUnderCursor(true)}
            onMouseLeave={() => setUnderCursor(false)}
        >
            {annotationsFiltersHistory.map(
                (element: string): JSX.Element => (
                    <Select.Option key={element} value={element}>
                        {element}
                    </Select.Option>
                ),
            )}
        </Select>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(AnnotationsFiltersInput);
