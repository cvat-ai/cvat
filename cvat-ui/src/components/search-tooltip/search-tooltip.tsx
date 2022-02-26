// Copyright (C) 2021-2022 Intel Corporation
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

// provider: isEnum.bind(CloudStorageProviderType),
// credentialsType: isEnum.bind(CloudStorageCredentialsType),

export default function SearchTooltip(props: Props): JSX.Element {
    const { instance, children } = props;
    const instances = ` ${instance}s `;

    return (
        <CVATTooltip
            overlayClassName={`cvat-${instance}s-search-tooltip cvat-search-tooltip`}
            title={(
                <>
                    {instance === 'cloudstorage' ? (
                        <Paragraph>
                            <Text strong>displayName: Azure</Text>
                            <Text>
                                all
                                {instances}
                                where name includes the substring
                                <q>Azure</q>
                            </Text>
                        </Paragraph>
                    ) : null}
                    {instance === 'cloudstorage' ? (
                        <Paragraph>
                            <Text strong>description: Personal bucket</Text>
                            <Text>
                                all
                                {instances}
                                where description includes the substring
                                <q>Personal bucket</q>
                            </Text>
                        </Paragraph>
                    ) : null}
                    {instance === 'cloudstorage' ? (
                        <Paragraph>
                            <Text strong>resource: mycvatbucket</Text>
                            <Text>
                                all
                                {instances}
                                where a name of the resource includes the substring
                                <q>mycvatbucket</q>
                            </Text>
                        </Paragraph>
                    ) : null}
                    {instance === 'cloudstorage' ? (
                        <Paragraph>
                            <Text strong>providerType: AWS_S3_BUCKET</Text>
                            <Text>
                                <q>AWS_S3_BUCKET</q>
                                or
                                <q>AZURE_CONTAINER</q>
                                or
                                <q>GOOGLE_CLOUD_STORAGE</q>
                            </Text>
                        </Paragraph>
                    ) : null}
                    {instance === 'cloudstorage' ? (
                        <Paragraph>
                            <Text strong>credentialsType: KEY_SECRET_KEY_PAIR</Text>
                            <Text>
                                <q>KEY_SECRET_KEY_PAIR</q>
                                or
                                <q>ACCOUNT_NAME_TOKEN_PAIR</q>
                                or
                                <q>KEY_FILE_PATH</q>
                                or
                                <q>ANONYMOUS_ACCESS</q>
                            </Text>
                        </Paragraph>
                    ) : null}
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
