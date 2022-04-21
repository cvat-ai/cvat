// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { ReactText, RefObject } from 'react';

import Tabs from 'antd/lib/tabs';
import Input from 'antd/lib/input';
import Text from 'antd/lib/typography/Text';
import Paragraph from 'antd/lib/typography/Paragraph';
import Upload, { RcFile } from 'antd/lib/upload';
import Empty from 'antd/lib/empty';
import Tree, { TreeNodeNormal } from 'antd/lib/tree/Tree';
import { FormInstance } from 'antd/lib/form';
// eslint-disable-next-line import/no-extraneous-dependencies
import { EventDataNode } from 'rc-tree/lib/interface';
import { InboxOutlined } from '@ant-design/icons';

import consts from 'consts';
import { CloudStorage } from 'reducers/interfaces';
import CloudStorageTab from './cloud-storages-tab';

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
    treeData: TreeNodeNormal[];
    onLoadData: (key: string, success: () => void, failure: () => void) => void;
    onChangeActiveKey(key: string): void;
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

        this.loadData('/');
    }

    private onSelectCloudStorageFiles = (cloudStorageFiles: string[]): void => {
        const { files } = this.state;
        this.setState({
            files: {
                ...files,
                cloudStorage: cloudStorageFiles,
            },
        });
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

    private loadData = (key: string): Promise<void> => new Promise<void>((resolve, reject): void => {
        const { onLoadData } = this.props;

        const success = (): void => resolve();
        const failure = (): void => reject();
        onLoadData(key, success, failure);
    });

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
        const { files } = this.state;

        return (
            <Tabs.TabPane className='cvat-file-manager-local-tab' key='local' tab='My computer'>
                <Upload.Dragger
                    multiple
                    listType='text'
                    fileList={files.local as any[]}
                    showUploadList={
                        files.local.length < 5 && {
                            showRemoveIcon: false,
                        }
                    }
                    beforeUpload={(_: RcFile, newLocalFiles: RcFile[]): boolean => {
                        this.setState({
                            files: {
                                ...files,
                                local: newLocalFiles,
                            },
                        });
                        return false;
                    }}
                >
                    <p className='ant-upload-drag-icon'>
                        <InboxOutlined />
                    </p>
                    <p className='ant-upload-text'>Click or drag files to this area</p>
                    <p className='ant-upload-hint'>Support for a bulk images or a single video</p>
                </Upload.Dragger>
                {files.local.length >= 5 && (
                    <>
                        <br />
                        <Text className='cvat-text-color'>{`${files.local.length} files selected`}</Text>
                    </>
                )}
            </Tabs.TabPane>
        );
    }

    private renderShareSelector(): JSX.Element {
        function renderTreeNodes(data: TreeNodeNormal[]): JSX.Element[] {
            // sort alphabetically
            data.sort((a: TreeNodeNormal, b: TreeNodeNormal): number => (
                a.key.toLocaleString().localeCompare(b.key.toLocaleString())));
            return data.map((item: TreeNodeNormal) => {
                if (item.children) {
                    return (
                        <Tree.TreeNode title={item.title} key={item.key} data={item} isLeaf={item.isLeaf}>
                            {renderTreeNodes(item.children)}
                        </Tree.TreeNode>
                    );
                }

                return <Tree.TreeNode {...item} key={item.key} data={item} />;
            });
        }

        const { SHARE_MOUNT_GUIDE_URL } = consts;
        const { treeData } = this.props;
        const { expandedKeys, files } = this.state;

        return (
            <Tabs.TabPane key='share' tab='Connected file share'>
                {treeData[0].children && treeData[0].children.length ? (
                    <Tree
                        className='cvat-share-tree'
                        checkable
                        showLine
                        height={256}
                        checkStrictly={false}
                        expandedKeys={expandedKeys}
                        checkedKeys={files.share}
                        loadData={(event: EventDataNode): Promise<void> => this.loadData(event.key.toLocaleString())}
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
                        }}
                    >
                        {renderTreeNodes(treeData)}
                    </Tree>
                ) : (
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
        const { files } = this.state;

        return (
            <Tabs.TabPane key='remote' tab='Remote sources'>
                <Input.TextArea
                    className='cvat-file-selector-remote'
                    placeholder='Enter one URL per line'
                    rows={6}
                    value={[...files.remote].join('\n')}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                        this.setState({
                            files: {
                                ...files,
                                remote: event.target.value.split('\n'),
                            },
                        });
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
                    onSelectFiles={this.onSelectCloudStorageFiles}
                />
            </Tabs.TabPane>
        );
    }

    public render(): JSX.Element {
        const { onChangeActiveKey } = this.props;
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
                    {this.renderCloudStorageSelector()}
                </Tabs>
            </>
        );
    }
}

export default FileManager;
