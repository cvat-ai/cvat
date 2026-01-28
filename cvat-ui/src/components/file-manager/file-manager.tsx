// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { RefObject } from 'react';

import Tabs, { TabsProps } from 'antd/lib/tabs';
import Input from 'antd/lib/input';
import { RcFile } from 'antd/lib/upload';
import { FormInstance } from 'antd/lib/form';

import { CloudStorage } from 'reducers';
import CloudStorageTab from './cloud-storages-tab';
import LocalFiles from './local-files';
import RemoteBrowser, { RemoteFile } from './remote-browser';

export interface Files {
    local: File[];
    share: string[];
    remote: string[];
    cloudStorage: string[];
}

interface State {
    files: Files;
    active: 'local' | 'share' | 'remote' | 'cloudStorage';
    cloudStorage: CloudStorage | null;
    potentialCloudStorage: string;
}

interface Props {
    many: boolean;
    onChangeActiveKey(key: string): void;
    onUploadLocalFiles(files: File[]): void;
    onUploadRemoteFiles(urls: string[]): void;
    onUploadShareFiles(files: RemoteFile[]): void;
    onUploadCloudStorageFiles(cloudStorageFiles: RemoteFile[]): void;
}

export class FileManager extends React.PureComponent<Props, State> {
    private cloudStorageTabFormRef: RefObject<FormInstance>;

    public constructor(props: Props) {
        super(props);
        this.cloudStorageTabFormRef = React.createRef<FormInstance>();

        this.state = {
            files: {
                local: [],
                share: [],
                remote: [],
                cloudStorage: [],
            },
            cloudStorage: null,
            potentialCloudStorage: '',
            active: 'local',
        };
    }

    private handleUploadCloudStorageFiles = (
        cloudStorageFiles: RemoteFile[],
    ): void => {
        const { files } = this.state;
        const { onUploadCloudStorageFiles } = this.props;
        this.setState({
            files: {
                ...files,
                cloudStorage: cloudStorageFiles.map((item) => item.key),
            },
        });
        onUploadCloudStorageFiles(cloudStorageFiles);
    };

    private handleUploadSharedStorageFiles = (
        shareFiles: RemoteFile[],
    ): void => {
        const { files } = this.state;
        const { onUploadShareFiles } = this.props;
        this.setState({
            files: {
                ...files,
                share: shareFiles.map((item) => item.key),
            },
        });
        onUploadShareFiles(shareFiles);
    };

    public getCloudStorageId(): number | null {
        const { cloudStorage } = this.state;
        return cloudStorage?.id || null;
    }

    public getFiles(): Files {
        const { active, files } = this.state;
        return {
            local: active === 'local' ? files.local : [],
            share: active === 'share' ? files.share : [],
            remote: active === 'remote' ? files.remote : [],
            cloudStorage: active === 'cloudStorage' ? files.cloudStorage : [],
        };
    }

    public reset(): void {
        const { active } = this.state;
        if (active === 'cloudStorage') {
            this.cloudStorageTabFormRef.current?.resetFields();
        }
        this.setState({
            active: 'local',
            files: {
                local: [],
                share: [],
                remote: [],
                cloudStorage: [],
            },
            cloudStorage: null,
            potentialCloudStorage: '',
        });
    }

    private renderLocalSelector(): NonNullable<TabsProps['items']>[0] {
        const { many, onUploadLocalFiles } = this.props;
        const { files } = this.state;

        return {
            key: 'local',
            label: 'My computer',
            className: 'cvat-file-manager-local-tab',
            children: (
                <LocalFiles
                    files={files.local}
                    many={many}
                    onUpload={(_: RcFile, newLocalFiles: RcFile[]): boolean => {
                        this.setState({
                            files: {
                                ...files,
                                local: newLocalFiles,
                            },
                        });
                        onUploadLocalFiles(newLocalFiles);
                        return false;
                    }}
                />
            ),
        };
    }

    private renderShareSelector(): NonNullable<TabsProps['items']>[0] {
        return {
            key: 'share',
            label: 'Connected file share',
            className: 'cvat-file-manager-share-tab',
            children: (
                <RemoteBrowser
                    resource='share'
                    onSelectFiles={this.handleUploadSharedStorageFiles}
                />
            ),
        };
    }

    private renderRemoteSelector(): NonNullable<TabsProps['items']>[0] {
        const { onUploadRemoteFiles } = this.props;
        const { files } = this.state;

        return {
            key: 'remote',
            label: 'Remote sources',
            className: 'cvat-file-manager-remote-tab',
            children: (
                <Input.TextArea
                    className='cvat-file-selector-remote'
                    placeholder='Enter one URL per line'
                    rows={6}
                    value={[...files.remote].join('\n')}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                        const urls = event.target.value.split('\n');
                        this.setState({
                            files: {
                                ...files,
                                remote: urls,
                            },
                        });
                        onUploadRemoteFiles(urls.filter(Boolean));
                    }}
                />
            ),
        };
    }

    private renderCloudStorageSelector(): NonNullable<TabsProps['items']>[0] {
        const { cloudStorage, potentialCloudStorage } = this.state;

        return {
            key: 'cloudStorage',
            label: 'Cloud Storage',
            className: 'cvat-create-task-page-cloud-storage-tab',
            children: (
                <CloudStorageTab
                    formRef={this.cloudStorageTabFormRef}
                    cloudStorage={cloudStorage}
                    onSelectCloudStorage={(_cloudStorage: CloudStorage | null) => {
                        this.setState({ cloudStorage: _cloudStorage });
                    }}
                    searchPhrase={potentialCloudStorage}
                    setSearchPhrase={(_potentialCloudStorage: string) => {
                        this.setState({ potentialCloudStorage: _potentialCloudStorage });
                    }}
                    onSelectFiles={this.handleUploadCloudStorageFiles}
                />
            ),
        };
    }

    public render(): JSX.Element {
        const { onChangeActiveKey } = this.props;
        const { active } = this.state;

        return (
            <Tabs
                type='card'
                activeKey={active}
                tabBarGutter={5}
                onChange={(activeKey: string): void => {
                    onChangeActiveKey(activeKey);
                    this.setState({
                        active: activeKey as any,
                    });
                }}
                items={[
                    this.renderLocalSelector(),
                    this.renderShareSelector(),
                    this.renderRemoteSelector(),
                    this.renderCloudStorageSelector(),
                ]}
            />
        );
    }
}

export default FileManager;
