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
    };

    private loadData = (key: string) => {
        const promise = new Promise<void>((resolve, reject) => {
            const success = () => resolve();
            const failure = () => reject();
            this.props.onLoadData(key, success, failure);
        });

        return promise;
    }

    private renderLocalSelector() {
        return (
            <Tabs.TabPane key='local' tab='My computer'>
                <Upload.Dragger
                    multiple
                    fileList={this.state.files.local as any[]}
                    showUploadList={false}
                    beforeUpload={(_: RcFile, files: RcFile[]) => {
                        this.setState({
                            files: {
                                ...this.state.files,
                                local: files
                            },
                        });
                        return false;
                    }
                }>
                    <p className='ant-upload-drag-icon'>
                        <Icon type='inbox' />
                    </p>
                    <p className='ant-upload-text'>Click or drag files to this area</p>
                    <p className='ant-upload-hint'>
                        Support for a bulk images or a single video
                    </p>
                </Upload.Dragger>
                { !!this.state.files.local.length &&
                    <>
                        <br/>
                        <Text className='cvat-black-color'>
                            {`${this.state.files.local.length} file(s) selected`}
                        </Text>
                    </>
                }
            </Tabs.TabPane>
        );
    }

    private renderShareSelector() {
        function renderTreeNodes(data: TreeNodeNormal[]) {
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

        return (
            <Tabs.TabPane key='share' tab='Connected file share'>
                { this.props.treeData.length ?
                    <Tree
                        className='cvat-share-tree'
                        checkable
                        showLine
                        checkStrictly={false}
                        expandedKeys={this.state.expandedKeys}
                        checkedKeys={this.state.files.share}
                        loadData={(node: AntTreeNode) => {
                            return this.loadData(node.props.dataRef.key);
                        }}
                        onExpand={(expandedKeys: string[]) => {
                            this.setState({
                                expandedKeys,
                            });
                        }}
                        onCheck={(checkedKeys: string[] | {checked: string[], halfChecked: string[]}) => {
                            const keys = checkedKeys as string[];
                            this.setState({
                                files: {
                                    ...this.state.files,
                                    share: keys,
                                },
                            });
                        }}>
                        { renderTreeNodes(this.props.treeData) }
                    </Tree> : <Text className='cvat-black-color'>{'No data found'}</Text>
                }
            </Tabs.TabPane>
        );
    }

    private renderRemoteSelector() {
        return (
            <Tabs.TabPane key='remote' tab='Remote sources'>
                <Input.TextArea
                    placeholder='Enter one URL per line'
                    rows={6}
                    value={[...this.state.files.remote].join('\n')}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                        this.setState({
                            files: {
                                ...this.state.files,
                                remote: event.target.value.split('\n'),
                            },
                        });
                    }}/>
            </Tabs.TabPane>
        );
    }

    public getFiles(): Files {
        return {
            local: this.state.active === 'local' ? this.state.files.local : [],
            share: this.state.active === 'share' ? this.state.files.share : [],
            remote: this.state.active === 'remote' ? this.state.files.remote : [],
        };
    }

    public reset() {
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

    public render() {
        return (
            <>
                <Tabs type='card' tabBarGutter={5} onChange={(activeKey: string) => this.setState({
                    active: activeKey as any,
                })}>
                    { this.renderLocalSelector() }
                    { this.renderShareSelector() }
                    { this.props.withRemote && this.renderRemoteSelector() }
                </Tabs>
            </>
        );
    }
}
