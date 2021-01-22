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
            <Text strong>Supported properties: </Text>
            width, height, label, serverID, clientID, type, shape, occluded
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
            <Title level={3}>Examples</Title>
            <ul>
                <li>label==&quot;car&quot; | label==[&quot;road sign&quot;]</li>
                <li>shape == &quot;polygon&quot;</li>
                <li>width &gt;= height</li>
                <li>attr[&quot;Attribute 1&quot;] == attr[&quot;Attribute 2&quot;]</li>
                <li>clientID == 50</li>
                <li>
                    (label==&quot;car&quot; &amp; attr[&quot;parked&quot;]==true) | (label==&quot;pedestrian&quot; &amp;
                    width &gt; 150)
                </li>
                <li>
                    (( label==[&quot;car \&quot;mazda\&quot;&quot;]) &amp; (attr[&quot;sunglasses&quot;]==true | (width
                    &gt; 150 | height &gt; 150 &amp; (clientID == serverID))))
                </li>
            </ul>
        </Paragraph>
    </Paragraph>
);

AnnotationFilterHelp.propTypes = {
    searchForwardShortcut: PropTypes.string.isRequired,
    searchBackwardShortcut: PropTypes.string.isRequired,
};

export default AnnotationFilterHelp;
