// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Tabs from 'antd/lib/tabs';
import Icon from 'antd/lib/icon';
import Input from 'antd/lib/input';
import Text from 'antd/lib/typography/Text';
import Paragraph from 'antd/lib/typography/Paragraph';
import Upload, { RcFile } from 'antd/lib/upload';
import Empty from 'antd/lib/empty';
import Tree, { AntTreeNode, TreeNodeNormal } from 'antd/lib/tree/Tree';

import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import { Checkbox, Divider } from 'antd';
const CheckboxGroup = Checkbox.Group;
import { CheckboxValueType } from 'antd/lib/checkbox/Group';

import { Task, TasksQuery } from 'reducers/interfaces';
import Spin from 'antd/lib/spin';

import consts from 'consts';

export interface Files {
    local: File[];
    share: string[];
    remote: string[];
    tasks: string[];
}

interface State {
    files: Files;
    expandedKeys: string[];
    active: 'local' | 'share' | 'remote' | 'tasks';
    first_time_switch_tasktab: boolean;
}

interface Props {
    withRemote: boolean;
    treeData: TreeNodeNormal[];
    onLoadData: (key: string, success: () => void, failure: () => void) => void;

    tasks: Task[];
    fetching: boolean;
    updating: boolean;
    getTasks: (query: TasksQuery) => void;
    currentTasksIndexes: number[];

}

export default class FileManager extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);

        this.state = {
            files: {
                local: [],
                share: [],
                remote: [],
                tasks: [],
            },
            expandedKeys: [],
            active: 'local',
            first_time_switch_tasktab: true,
        };

        this.loadData('/');
    }

    public getFiles(): Files {
        const { active, files } = this.state;
        return {
            local: active === 'local' ? files.local : [],
            share: active === 'share' ? files.share : [],
            remote: active === 'remote' ? files.remote : [],
            tasks: active === 'tasks' ? files.tasks : [],
        };
    }

    private loadData = (key: string): Promise<void> =>
        new Promise<void>((resolve, reject): void => {
            const { onLoadData } = this.props;

            const success = (): void => resolve();
            const failure = (): void => reject();
            onLoadData(key, success, failure);
        });

    public reset(): void {
        this.setState({
            expandedKeys: [],
            active: 'local',
            files: {
                local: [],
                share: [],
                remote: [],
                tasks: [],
            },
            first_time_switch_tasktab: true,
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
                        <Icon type='inbox' />
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
            data.sort((a: TreeNodeNormal, b: TreeNodeNormal): number => a.key.localeCompare(b.key));
            return data.map((item: TreeNodeNormal) => {
                if (item.children) {
                    return (
                        <Tree.TreeNode title={item.title} key={item.key} dataRef={item} isLeaf={item.isLeaf}>
                            {renderTreeNodes(item.children)}
                        </Tree.TreeNode>
                    );
                }

                return <Tree.TreeNode key={item.key} {...item} dataRef={item} />;
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
                        checkStrictly={false}
                        expandedKeys={expandedKeys}
                        checkedKeys={files.share}
                        loadData={(node: AntTreeNode): Promise<void> => this.loadData(node.props.dataRef.key)}
                        onExpand={(newExpandedKeys: string[]): void => {
                            this.setState({
                                expandedKeys: newExpandedKeys,
                            });
                        }}
                        onCheck={(
                            checkedKeys:
                                | string[]
                                | {
                                    checked: string[];
                                    halfChecked: string[];
                                },
                        ): void => {
                            const keys = checkedKeys as string[];
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

    private renderTasksSelector(): JSX.Element {
        const { files } = this.state;
        const { fetching, currentTasksIndexes } = this.props;

        const onChange = (rawList: CheckboxValueType[]) => {
            let list = (rawList as string[]);
            this.setState({
                files: {
                    ...files,
                    tasks: list,
                },
            });
        };
        if (fetching) {
            return <Spin size='large' className='cvat-spinner' />;
        } else {
            return (
                <div className='cvat-picked-tasks'>
                    <Divider>Choose task ID</Divider>
                    <CheckboxGroup options={this.props.currentTasksIndexes.map((taskId): string => taskId.toString())} value={this.state.files.tasks} onChange={onChange} />
                </div>
            );
        }

    }

    public render(): JSX.Element {
        const { withRemote, getTasks, currentTasksIndexes, fetching } = this.props;
        const { active } = this.state;

        return (
            <>
                <Tabs
                    type='card'
                    activeKey={active}
                    tabBarGutter={5}
                    onChange={(activeKey: string): void => {
                        this.setState({
                            active: activeKey as any,
                        });
                        if (activeKey === "tasks" && this.state.first_time_switch_tasktab) {
                            if (!fetching) {
                                getTasks({
                                    page: null,
                                    id: null,
                                    search: null,
                                    owner: null,
                                    assignee: null,
                                    name: null,
                                    status: null,
                                    mode: null,
                                });
                                this.setState({
                                    first_time_switch_tasktab: false,
                                })
                            };
                        }
                    }
                    }
                >
                    {this.renderLocalSelector()}
                    {this.renderShareSelector()}
                    {withRemote && this.renderRemoteSelector()}

                    <Tabs.TabPane key='tasks' tab='Completed tasks'>
                        {this.renderTasksSelector()}
                    </Tabs.TabPane>

                </Tabs>
            </>
        );
    }
}
