// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import Text from 'antd/lib/typography/Text';
import Paragraph from 'antd/lib/typography/Paragraph';

import './styles.scss';
import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    instance: 'task' | 'project' | 'cloudstorage';
    children: JSX.Element;
}

export default function SearchTooltip(props: Props): JSX.Element {
    const { instance, children } = props;
    const instances = ` ${instance}s `;

    return (
        <CVATTooltip
            overlayClassName={`cvat-${instance}s-search-tooltip cvat-search-tooltip`}
            title={(
                <>
                    <Paragraph>
                        <Text strong>owner: admin</Text>
                        <Text>
                            all
                            {instances}
                            created by users who have the substring
                            <q>admin</q>
                            in their username
                        </Text>
                    </Paragraph>
                    {instance !== 'cloudstorage' ? (
                        <Paragraph>
                            <Text strong>assignee: employee</Text>
                            <Text>
                                all
                                {instances}
                                which are assigned to a user who has the substring
                                <q>admin</q>
                                in their username
                            </Text>
                        </Paragraph>
                    ) : null}
                    {instance === 'cloudstorage' ? (
                        <Paragraph>
                            <Text strong>displayName: Azure</Text>
                            <Text>
                                all
                                {instances}
                                where names include the substring
                                <q>Azure</q>
                            </Text>
                        </Paragraph>
                    ) : null}
                    {instance === 'cloudstorage' ? (
                        <Paragraph>
                            <Text strong>status: avaliable</Text>
                            <Text>
                                all available/unavailable
                                {instances}
                            </Text>
                        </Paragraph>
                    ) : null}
                    {instance !== 'cloudstorage' ? (
                        <Paragraph>
                            <Text strong>name: training</Text>
                            <Text>
                                all
                                {instances}
                                with the substring
                                <q>training</q>
                                in its name
                            </Text>
                        </Paragraph>
                    ) : null}
                    {instance === 'task' ? (
                        <Paragraph>
                            <Text strong>mode: annotation</Text>
                            <Text>
                                annotation tasks are tasks with images, interpolation tasks are tasks with videos
                            </Text>
                        </Paragraph>
                    ) : null}
                    {instance !== 'cloudstorage' ? (
                        <Paragraph>
                            <Text strong>status: annotation</Text>
                            <Text>annotation, validation, or completed</Text>
                        </Paragraph>
                    ) : null}
                    <Paragraph>
                        <Text strong>id: 5</Text>
                        <Text>
                            the
                            {` ${instance} `}
                            with id 5
                        </Text>
                    </Paragraph>
                    <Paragraph>
                        <Text>
                            Filters can be combined (to the exclusion of id) using the keyword AND. Example:
                            <Text type='warning'>
                                <q>status: annotation AND owner: admin</q>
                            </Text>
                        </Text>
                    </Paragraph>
                    <Paragraph>
                        <Text type='success'>Search within all the string fields by default</Text>
                    </Paragraph>
                </>
            )}
        >
            {children}
        </CVATTooltip>
    );
}
