// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import PropTypes from 'prop-types';
import React, { ReactElement } from 'react';
import './annotation-filter-panel.scss';

interface Props {
    searchForwardShortcut: string;
    searchBackwardShortcut: string;
}

const AnnotationFilterHelp = ({ searchForwardShortcut, searchBackwardShortcut }: Props): ReactElement => (
    <Paragraph>
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
            <Text strong>Supported properties:</Text>
            label, width, height, serverID, clientID, type, shape, occluded, attribute, empty frame
            <br />
            <Text strong>Supported operators: </Text>
            ==, !=, &gt;, &gt;=, &lt;, &lt;=, (), &amp; and |
            <br />
            <Text strong>
                If you have double quotes in your query string, please escape them using back slash: \&quot; (see the
                latest example)
            </Text>
            <br />
            All properties and values are case-sensitive. CVAT uses json queries to perform search.
        </Paragraph>
        <Paragraph>
            <Title level={5}>Filters grouping</Title>
            Inside filters pane you can group filters
            <br />
            <br />
            <Text strong>Shift + Left click: </Text>
            Add an open brace before clicked item
            <br />
            <Text strong>Shift + Right click: </Text>
            Add a close brace after clicked item
            <br />
            <Text strong>Alt (Option for Mac users) + Left click: </Text>
            Remove an open brace before clicked item
            <br />
            <Text strong>Alt (Option for Mac users) + Right click: </Text>
            Remove a close brace after clicked item
            <br />
            <br />
            If grouping is invalid you will see the red border across the pane
        </Paragraph>
    </Paragraph>
);

AnnotationFilterHelp.propTypes = {
    searchForwardShortcut: PropTypes.string.isRequired,
    searchBackwardShortcut: PropTypes.string.isRequired,
};

export default AnnotationFilterHelp;
