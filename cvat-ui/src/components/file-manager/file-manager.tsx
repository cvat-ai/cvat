// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';

import {
    Tabs,
    Icon,
    Input,
    Upload,
} from 'antd';

import Tree, { AntTreeNode, TreeNodeNormal } from 'antd/lib/tree/Tree';
import { RcFile } from 'antd/lib/upload';
import Text from 'antd/lib/typography/Text';

export interface Files {
    local: File[];
    share: string[];
    remote: string[];
}

interface State {
    files: Files;
    expandedKeys: string[];
    active: 'local' | 'share' | 'remote';
}

interface Props {
    withRemote: boolean;
    treeData: TreeNodeNormal[];
    onLoadData: (key: string, success: () => void, failure: () => void) => void;
}

export default class FileManager extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);

        this.state = {
            files: {
                local: [],
                share: [],
                remote: [],
            },
            expandedKeys: [],
            active: 'local',
        };

        this.loadData('/');
    }

    public getFiles(): Files {
        const {
            active,
            files,
        } = this.state;
        return {
            local: active === 'local' ? files.local : [],
            share: active === 'share' ? files.share : [],
            remote: active === 'remote' ? files.remote : [],
        };
    }

    private loadData = (key: string): Promise<void> => new Promise<void>(
        (resolve, reject): void => {
            const { onLoadData } = this.props;

            const success = (): void => resolve();
            const failure = (): void => reject();
            onLoadData(key, success, failure);
        },
    );

    public reset(): void {
        this.setState({
            expandedKeys: [],
            active: 'local',
            files: {
                local: [],
                share: [],
                remote: [],
            },
        });
    }

    private renderLocalSelector(): JSX.Element {
        const { files } = this.state;

        return (
            <Tabs.TabPane key='local' tab='My computer'>
                <Upload.Dragger
                    multiple
                    listType='text'
                    fileList={files.local as any[]}
                    showUploadList={files.local.length < 5 && {
                        showRemoveIcon: false,
                    }}
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
                        <Icon type='inbox' />
                    </p>
                    <p className='ant-upload-text'>Click or drag files to this area</p>
                    <p className='ant-upload-hint'>
                        Support for a bulk images or a single video
                    </p>
                </Upload.Dragger>
                { files.local.length >= 5
                    && (
                        <>
                            <br />
                            <Text className='cvat-text-color'>
                                {`${files.local.length} files selected`}
                            </Text>
                        </>
                    )}
            </Tabs.TabPane>
        );
    }

    private renderShareSelector(): JSX.Element {
        function renderTreeNodes(data: TreeNodeNormal[]): JSX.Element[] {
            return data.map((item: TreeNodeNormal) => {
                if (item.children) {
                    return (
                        <Tree.TreeNode
                            title={item.title}
                            key={item.key}
                            dataRef={item}
                            isLeaf={item.isLeaf}
                        >
                            {renderTreeNodes(item.children)}
                        </Tree.TreeNode>
                    );
                }

                return <Tree.TreeNode key={item.key} {...item} dataRef={item} />;
            });
        }

        const { treeData } = this.props;
        const {
            expandedKeys,
            files,
        } = this.state;

        return (
            <Tabs.TabPane key='share' tab='Connected file share'>
                { treeData.length
                    ? (
                        <Tree
                            className='cvat-share-tree'
                            checkable
                            showLine
                            checkStrictly={false}
                            expandedKeys={expandedKeys}
                            checkedKeys={files.share}
                            loadData={(node: AntTreeNode): Promise<void> => this.loadData(
                                node.props.dataRef.key,
                            )}
                            onExpand={(newExpandedKeys: string[]): void => {
                                this.setState({
                                    expandedKeys: newExpandedKeys,
                                });
                            }}
                            onCheck={
                                (checkedKeys: string[] | {
                                    checked: string[];
                                    halfChecked: string[];
                                }): void => {
                                    const keys = checkedKeys as string[];
                                    this.setState({
                                        files: {
                                            ...files,
                                            share: keys,
                                        },
                                    });
                                }
                            }
                        >
                            { renderTreeNodes(treeData) }
                        </Tree>
                    ) : <Text className='cvat-text-color'>No data found</Text>}
            </Tabs.TabPane>
        );
    }

    private renderRemoteSelector(): JSX.Element {
        const { files } = this.state;

        return (
            <Tabs.TabPane key='remote' tab='Remote sources'>
                <Input.TextArea
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

    public render(): JSX.Element {
        const { withRemote } = this.props;
        const { active } = this.state;

        return (
            <>
                <Tabs
                    type='card'
                    activeKey={active}
                    tabBarGutter={5}
                    onChange={
                        (activeKey: string): void => this.setState({
                            active: activeKey as any,
                        })
                    }
                >
                    { this.renderLocalSelector() }
                    { this.renderShareSelector() }
                    { withRemote && this.renderRemoteSelector() }
                </Tabs>
            </>
        );
    }
}
