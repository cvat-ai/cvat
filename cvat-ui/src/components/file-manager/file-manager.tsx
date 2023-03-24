// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { ReactText, RefObject } from 'react';

import Tabs from 'antd/lib/tabs';
import Input from 'antd/lib/input';
import Text from 'antd/lib/typography/Text';
import Paragraph from 'antd/lib/typography/Paragraph';
import { RcFile } from 'antd/lib/upload';
import Empty from 'antd/lib/empty';
import Tree, { TreeNodeNormal } from 'antd/lib/tree/Tree';
import { FormInstance } from 'antd/lib/form';
// eslint-disable-next-line import/no-extraneous-dependencies
import { EventDataNode } from 'rc-tree/lib/interface';

import config from 'config';
import { CloudStorage } from 'reducers';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import CloudStorageTab from './cloud-storages-tab';
import LocalFiles from './local-files';

export interface Files {
    local: File[];
    share: string[];
    remote: string[];
    cloudStorage: string[];
}

interface State {
    files: Files;
    expandedKeys: string[];
    active: 'local' | 'share' | 'remote' | 'cloudStorage';
    cloudStorage: CloudStorage | null;
    potentialCloudStorage: string;
}

interface Props {
    sharedStorageInitialized: boolean;
    sharedStorageFetching: boolean;
    treeData: (TreeNodeNormal & { mime_type: string })[];
    many: boolean;
    onLoadData: (key: string) => Promise<any>;
    onChangeActiveKey(key: string): void;
    onUploadLocalFiles(files: File[]): void;
    onUploadRemoteFiles(urls: string[]): void;
    onUploadShareFiles(keys: string[]): Promise<void>;
    onUploadCloudStorageFiles(cloudStorageFiles: string[]): void;
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
            expandedKeys: [],
            active: 'local',
        };
    }

    public componentDidUpdate(): void {
        const { active } = this.state;
        const { onLoadData, sharedStorageInitialized, sharedStorageFetching } = this.props;

        if (active === 'share' && !sharedStorageInitialized && !sharedStorageFetching) {
            onLoadData('/');
        }
    }

    private handleUploadCloudStorageFiles = (cloudStorageFiles: string[]): void => {
        const { files } = this.state;
        const { onUploadCloudStorageFiles } = this.props;
        this.setState({
            files: {
                ...files,
                cloudStorage: cloudStorageFiles,
            },
        });
        onUploadCloudStorageFiles(cloudStorageFiles);
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
            expandedKeys: [],
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

    private renderLocalSelector(): JSX.Element {
        const { many, onUploadLocalFiles } = this.props;
        const { files } = this.state;

        return (
            <Tabs.TabPane className='cvat-file-manager-local-tab' key='local' tab='My computer'>
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
            </Tabs.TabPane>
        );
    }

    private renderShareSelector(): JSX.Element {
        function getTreeNodes(data: TreeNodeNormal[]): TreeNodeNormal[] {
            // sort alphabetically
            return data
                .sort((a: TreeNodeNormal, b: TreeNodeNormal): number => (
                    a.key.toLocaleString().localeCompare(b.key.toLocaleString())))
                .map((it) => ({
                    ...it,
                    children: it.children ? getTreeNodes(it.children) : undefined,
                }));
        }

        const { SHARE_MOUNT_GUIDE_URL } = config;
        const {
            treeData, sharedStorageInitialized, onUploadShareFiles, onLoadData,
        } = this.props;
        const { expandedKeys, files } = this.state;

        return (
            <Tabs.TabPane key='share' tab='Connected file share'>
                {!sharedStorageInitialized && (
                    <div className='cvat-share-tree-initialization'>
                        <CVATLoadingSpinner />
                    </div>
                )}
                {sharedStorageInitialized && !!treeData[0].children?.length && (
                    <Tree
                        className='cvat-share-tree'
                        checkable
                        showLine
                        height={256}
                        checkStrictly={false}
                        expandedKeys={expandedKeys}
                        checkedKeys={files.share}
                        loadData={(event: EventDataNode): Promise<void> => onLoadData(event.key.toLocaleString())}
                        onExpand={(newExpandedKeys: ReactText[]): void => {
                            this.setState({
                                expandedKeys: newExpandedKeys.map((text: ReactText): string => text.toLocaleString()),
                            });
                        }}
                        onCheck={(
                            checkedKeys:
                            | ReactText[]
                            | {
                                checked: ReactText[];
                                halfChecked: ReactText[];
                            },
                        ): void => {
                            const keys = (checkedKeys as ReactText[]).map((text: ReactText): string => (
                                text.toLocaleString()));
                            this.setState({
                                files: {
                                    ...files,
                                    share: keys,
                                },
                            });
                            onUploadShareFiles(keys).then().catch();
                        }}
                        treeData={getTreeNodes(treeData)}
                    />
                )}
                {sharedStorageInitialized && !treeData[0].children?.length && (
                    <div className='cvat-empty-share-tree'>
                        <Empty />
                        <Paragraph className='cvat-text-color'>
                            Please, be sure you had
                            <Text strong>
                                <a href={SHARE_MOUNT_GUIDE_URL}> mounted </a>
                            </Text>
                            share before you built CVAT and the shared storage contains files
                        </Paragraph>
                    </div>
                )}
            </Tabs.TabPane>
        );
    }

    private renderRemoteSelector(): JSX.Element {
        const { onUploadRemoteFiles } = this.props;
        const { files } = this.state;

        return (
            <Tabs.TabPane key='remote' tab='Remote sources'>
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
            </Tabs.TabPane>
        );
    }

    private renderCloudStorageSelector(): JSX.Element {
        const { cloudStorage, potentialCloudStorage, files } = this.state;
        return (
            <Tabs.TabPane
                key='cloudStorage'
                className='cvat-create-task-page-cloud-storage-tab'
                tab={<span> Cloud Storage </span>}
            >
                <CloudStorageTab
                    formRef={this.cloudStorageTabFormRef}
                    cloudStorage={cloudStorage}
                    selectedFiles={files.cloudStorage.filter((item) => !item.endsWith('.jsonl'))}
                    onSelectCloudStorage={(_cloudStorage: CloudStorage | null) => {
                        this.setState({ cloudStorage: _cloudStorage });
                    }}
                    searchPhrase={potentialCloudStorage}
                    setSearchPhrase={(_potentialCloudStorage: string) => {
                        this.setState({ potentialCloudStorage: _potentialCloudStorage });
                    }}
                    onSelectFiles={this.handleUploadCloudStorageFiles}
                />
            </Tabs.TabPane>
        );
    }

    public render(): JSX.Element {
        const { onChangeActiveKey, many } = this.props;
        const { active } = this.state;

        return (
            <>
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
                >
                    {this.renderLocalSelector()}
                    {this.renderShareSelector()}
                    {this.renderRemoteSelector()}
                    {!many && this.renderCloudStorageSelector()}
                </Tabs>
            </>
        );
    }
}

export default FileManager;
