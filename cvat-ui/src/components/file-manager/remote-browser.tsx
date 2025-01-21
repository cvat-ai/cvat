// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    MouseEvent, useEffect, useState, useRef, useCallback,
} from 'react';
import Breadcrumb from 'antd/lib/breadcrumb';
import Button from 'antd/lib/button';
import Pagination from 'antd/lib/pagination';
import Table from 'antd/lib/table';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';
import Input from 'antd/lib/input';
import Row from 'antd/lib/row';
import Col from 'antd/lib/col';
import Empty from 'antd/lib/empty';
import Alert from 'antd/lib/alert';
import notification from 'antd/lib/notification';
import {
    FileOutlined, FolderOutlined, RightOutlined, SearchOutlined, InfoCircleOutlined, SyncOutlined,
} from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';
import { getCore } from 'cvat-core-wrapper';
import config from 'config';
import { CloudStorage, RemoteFileType } from 'reducers';
import { useIsMounted } from 'utils/hooks';

interface Node {
    children: Node[];
    initialized: boolean;
    name: string;
    key: string;
    type: RemoteFileType;
    mimeType: string;
    searchString?: string;
    nextToken?: string | null;
}

export type RemoteFile = Pick<Node, 'key' | 'type' | 'mimeType' | 'name'>;

interface Props {
    resource: 'share' | CloudStorage;
    manifestPath?: string;
    defaultPrefix?: string;
    onSelectFiles: (checkedKeysValue: RemoteFile[]) => void;
}

const core = getCore();

const defaultSearchString = '';
const defaultPath = ['root'];
const getDefaultRoot = (): Node => ({
    name: 'root',
    key: 'root',
    children: [],
    type: 'DIR',
    mimeType: 'DIR',
    initialized: false,
    nextToken: null,
});

function prefixToPath(prefix?: string): string[] {
    if (prefix) {
        return [
            ...defaultPath,
            ...prefix.substring(0, prefix.lastIndexOf('/') + 1).split('/').filter((item) => !!item),
        ];
    }

    return defaultPath;
}

function prefixToSearch(prefix?: string): string {
    if (prefix && !prefix.endsWith('/')) {
        return prefix.substring(prefix.lastIndexOf('/') + 1);
    }

    return defaultSearchString;
}

const updateRoot = (root: Node, prefix?: string): Node => {
    if (prefix) {
        const path = prefixToPath(prefix);
        const search = prefixToSearch(prefix);
        if (path.length > 1 && !root.initialized) {
            let current = root;
            for (let i = 1; i < path.length; i++) {
                const subpath = path[i];
                const child = {
                    name: subpath,
                    key: path.slice(1, i + 1).join('/'),
                    children: [],
                    type: 'DIR' as RemoteFileType,
                    mimeType: 'DIR',
                    initialized: true,
                    nextToken: null,
                };
                current.children.push(child);
                current.initialized = true;
                current = child;
            }

            // disable initialization of the latest one to run content request
            current.initialized = false;
            current.searchString = search;
            root.initialized = true;
            return root;
        }
    }

    return root;
};

function RemoteBrowser(props: Props): JSX.Element {
    const { SHARE_MOUNT_GUIDE_URL } = config;
    const {
        resource, manifestPath, defaultPrefix, onSelectFiles,
    } = props;

    const pathFromDefPrefix = prefixToPath(defaultPrefix);

    const isMounted = useIsMounted();
    const resourceRef = useRef<Props['resource']>(resource);
    const manifestPathRef = useRef<string | undefined>(manifestPath);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFetching, setFetching] = useState(false);
    const [currentPath, setCurrentPath] = useState(pathFromDefPrefix);
    const [content, setContent] = useState<Node>(updateRoot(getDefaultRoot(), defaultPrefix));

    let dataSource = content;
    for (const subpath of currentPath.slice(1)) {
        const child = (dataSource.children as Node[]).find((item) => item.name === subpath);
        dataSource = child as Node;
    }

    const [curSearchString, setCurSearchString] = useState(dataSource.searchString);
    const isRoot = useCallback((): boolean => currentPath.slice(1).length === 0, [currentPath]);

    // method updates content of the current node
    // if it was not initialized or the next token is defined
    const updateContent = async (): Promise<boolean> => {
        const { searchString } = dataSource;
        if (!dataSource.initialized || dataSource.nextToken) {
            const path = `${currentPath.slice(1).join('/')}/`;
            const convertChildren = (children: Omit<Node, 'key' | 'children'>[]): Node[] => (
                children.map((child) => {
                    const ending = `${child.type === 'DIR' ? '/' : ''}`;
                    return {
                        ...child,
                        key: isRoot() ? `${child.name}${ending}` : `${path}${child.name}${ending}`,
                        initialized: false,
                        children: [],
                    };
                })
            );
            setFetching(true);
            const currentResource = resourceRef.current;
            const currentManifest = manifestPathRef.current;
            const isRelevant = (): boolean => (
                // check if component is still relevant after async request
                // and resource & share are the same if not, results are not valid anymore
                isMounted() &&
                currentResource === resourceRef.current &&
                currentManifest === manifestPathRef.current
            );

            try {
                let nodes: Node[] = [];
                if (resource === 'share') {
                    const files: (Omit<Node, 'key' | 'children'>)[] = await core.server.share(path, searchString);
                    nodes = convertChildren(files);
                } else {
                    const response: { next: string | null, content: Omit<Node, 'key' | 'children'>[] } =
                        await resource.getContent(`${path}${(searchString) || ''}`, dataSource.nextToken, manifestPath);
                    const { next, content: files } = response;
                    dataSource.nextToken = next;
                    nodes = convertChildren(files);
                }

                dataSource.children = dataSource.children.concat(nodes);
                dataSource.initialized = true;
                if (isRelevant()) {
                    // select all new children if parent was selected
                    if (selectedRowKeys.includes(dataSource.key)) {
                        const copy = selectedRowKeys.slice(0);
                        for (const child of nodes) {
                            copy.push(child.key);
                        }
                        setSelectedRowKeys(copy);
                    }

                    setContent({ ...content });
                    return true;
                }
            } catch (error: any) {
                if (isRelevant()) {
                    notification.error({
                        message: 'Storage content fetching failed',
                        description: error.toString(),
                    });
                }
            } finally {
                if (isRelevant()) {
                    setFetching(false);
                }
            }
        }

        return false;
    };

    // in case of refetch request, or changing a search string
    // we need to request content again
    // to do that, we reset initialized state
    const resetDataSource = (force = false): void => {
        if (dataSource.searchString !== curSearchString || force) {
            dataSource.searchString = curSearchString;
            dataSource.children = [];
            dataSource.initialized = false;
            dataSource.nextToken = null;
            updateContent().then((updated) => {
                if (updated) {
                    setCurrentPage(1);
                }
            });
        }
    };

    // when change cloud storage or manifest
    // need to reset the whole state
    useEffect(() => {
        if (resourceRef.current !== resource ||
            manifestPathRef.current !== manifestPath) {
            setContent(updateRoot(getDefaultRoot(), defaultPrefix));
            setCurrentPage(1);
            setFetching(false);
            setCurrentPath(prefixToPath(defaultPrefix));
            setSelectedRowKeys([]);
            resourceRef.current = resource;
            manifestPathRef.current = manifestPath;
        }
    }, [resource, manifestPath]);

    useEffect(() => {
        const nodes: Node[] = [];
        const collectNodes = (node: Node): void => {
            for (const child of node.children) {
                if (selectedRowKeys.includes(child.key)) {
                    nodes.push(child);
                }
                collectNodes(child);
            }
        };
        collectNodes(content);

        if (manifestPath) {
            nodes.push({
                name: manifestPath,
                key: manifestPath,
                children: [],
                type: 'REG',
                mimeType: 'unknown',
                initialized: true,
            });
        }

        onSelectFiles(nodes);
    }, [selectedRowKeys, manifestPath]);

    useEffect(() => {
        const button = window.document.getElementsByClassName('cvat-remote-browser-receive-more-btn')[0];
        if (button) {
            if (isFetching) {
                button.setAttribute('disabled', '');
            } else {
                button.removeAttribute('disabled');
            }
        }
    });

    useEffect(() => {
        setCurrentPage(1);
        setCurSearchString(dataSource.searchString);
        if (!dataSource.initialized) {
            updateContent();
        }
    }, [dataSource]);

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, node: Node) => {
                if (node.type === 'DIR') {
                    return (
                        <Button
                            size='small'
                            type='link'
                            onClick={() => {
                                setCurrentPath([...currentPath, name]);
                            }}
                        >
                            <FolderOutlined />
                            {name}
                        </Button>
                    );
                }

                return (
                    <>
                        <FileOutlined className='cvat-remote-browser-file-icon' />
                        {name}
                    </>
                );
            },
        },
    ];

    if (resource === 'share' && content.initialized && !content.children.length && !content.searchString) {
        return (
            <>
                <Empty />
                <Paragraph className='cvat-remote-browser-empty'>
                    Please, be sure you had
                    <Text strong>
                        <a href={SHARE_MOUNT_GUIDE_URL}> mounted </a>
                    </Text>
                    share before you built CVAT and the shared storage contains files
                </Paragraph>
            </>
        );
    }

    const PAGE_SIZE = 500;
    return (
        <div>
            <Breadcrumb
                items={
                    currentPath.map((segment: string, idx: number) => {
                        const key = currentPath.slice(0, idx + 1).join('/');
                        return {
                            className: 'cvat-remote-browser-nav-breadcrumb',
                            onClick: () => {
                                setCurrentPath(key.split('/'));
                            },
                            key,
                            title: segment,
                        };
                    })
                }
            />

            <Row className='cvat-remote-browser-search-wrapper' justify='space-between'>
                <Col span={22}>
                    <Input
                        addonBefore={<SearchOutlined />}
                        suffix={resource !== 'share' && !!resource.prefix && (
                            <CVATTooltip title={`Default prefix "${resource.prefix}" is used`}>
                                <InfoCircleOutlined style={{ opacity: 0.5 }} />
                            </CVATTooltip>
                        )}
                        disabled={isFetching}
                        placeholder='Search by prefix'
                        value={curSearchString}
                        onBlur={() => resetDataSource()}
                        onPressEnter={() => resetDataSource()}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            setCurSearchString(event.target.value);
                        }}
                    />
                </Col>
                <Col>
                    <CVATTooltip title='Refresh'>
                        <Button
                            disabled={isFetching}
                            onClick={() => {
                                resetDataSource(true);
                            }}
                        >
                            <SyncOutlined />
                        </Button>
                    </CVATTooltip>
                </Col>
                { defaultPrefix && dataSource.searchString &&
                pathFromDefPrefix.length === currentPath.length &&
                pathFromDefPrefix.every((el, idx) => currentPath[idx] === el) &&
                (
                    !dataSource.searchString.includes(prefixToSearch(defaultPrefix) || '') &&
                    !(prefixToSearch(defaultPrefix) || '').includes(dataSource.searchString)
                ) && (
                    <Col className='cvat-remote-browser-incorrect-cs-prefix-wrapper' span={24}>
                        <Alert
                            type='warning'
                            message={(
                                <>
                                    <Text>
                                        There is no intersection between the specified prefix and the default one
                                    </Text>
                                    <Text strong>{` "${defaultPrefix}". `}</Text>
                                </>
                            )}
                        />
                    </Col>
                )}
            </Row>

            <div className='cvat-remote-browser-table-wrapper'>
                <Table
                    scroll={{ y: 472 }}
                    rowSelection={{
                        type: 'checkbox',
                        selectedRowKeys,
                        onChange: (_selectedRowKeys) => {
                            let copy = _selectedRowKeys.slice(0);

                            if (!copy.includes(dataSource.key) && !dataSource.nextToken && !dataSource.searchString) {
                                // select parent if all children have been fetched and selected
                                if (dataSource.children.every((child) => copy.includes(child.key))) {
                                    copy.push(dataSource.key);

                                    // also update all the parents recursively
                                    const traverse = (node: Node, selectedKeys: React.Key[]): boolean => {
                                        if (dataSource === node) {
                                            return true;
                                        }

                                        for (const child of node.children) {
                                            // true if target node is a descendant and it was added to keys
                                            const val = traverse(child, selectedKeys);
                                            if (val) {
                                                // check and update ancestor if necessary
                                                if (node.children
                                                    .every((_child) => selectedKeys.includes(_child.key))) {
                                                    selectedKeys.push(node.key);
                                                    return true;
                                                }
                                            }
                                        }

                                        return false;
                                    };

                                    for (const child of content.children) {
                                        traverse(child, copy);
                                    }
                                }
                            }

                            // deselect children if parent was deselected
                            const deselectedKeys = selectedRowKeys.filter((key) => !_selectedRowKeys.includes(key));
                            for (const key of deselectedKeys) {
                                if (key.toLocaleString().endsWith('/')) {
                                    copy = copy.filter((_key) => !_key.toLocaleString()
                                        .startsWith(`${key.toLocaleString()}`));
                                }
                            }

                            // deselect parent if a child was deselected
                            copy = copy.filter((key) => !key.toLocaleString().endsWith('/') || !deselectedKeys
                                .some((_key) => _key.toLocaleString().startsWith(`${key.toLocaleString()}`)));

                            // select all children if parent was selected
                            const selectChildren = (node: Node): void => {
                                for (const child of node.children) {
                                    if (!copy.includes(child.key)) {
                                        copy.push(child.key);
                                        selectChildren(child);
                                    }
                                }
                            };
                            const listenedNodes = dataSource.children;
                            for (const node of listenedNodes) {
                                if (copy.includes(node.key)) {
                                    selectChildren(node);
                                }
                            }

                            setSelectedRowKeys(copy);
                        },
                        preserveSelectedRowKeys: true,
                        getCheckboxProps: (record: Node) => {
                            if (record.type !== 'DIR') {
                                return {};
                            }

                            const strKeys = selectedRowKeys.map((key) => key.toLocaleString());
                            const subkeys = strKeys.filter((key: string) => (
                                key.startsWith(`${record.key}`) && key.length > record.key.length
                            ));

                            const some = !!subkeys.length;
                            const every = strKeys.includes(record.key);

                            if (some && !every) {
                                return {
                                    indeterminate: true,
                                };
                            }

                            return {};
                        },
                    }}
                    expandable={{
                        childrenColumnName: '$children',
                    }}
                    loading={isFetching}
                    size='small'
                    columns={columns}
                    pagination={{
                        pageSize: PAGE_SIZE,
                        current: currentPage,
                        showPrevNextJumpers: false,
                    }}
                    dataSource={dataSource.children}
                />
                <Pagination
                    className='cvat-remote-browser-pages'
                    pageSize={PAGE_SIZE}
                    showQuickJumper
                    showSizeChanger={false}
                    total={dataSource.children.length}
                    onChange={(newPage: number) => {
                        setCurrentPage(newPage);
                    }}
                    current={currentPage}
                    itemRender={(_, type, originalElement) => {
                        if (type === 'next') {
                            if (dataSource.nextToken) {
                                return (
                                    <button
                                        type='button'
                                        className='cvat-remote-browser-receive-more-btn ant-pagination-item-link'
                                    >
                                        <RightOutlined onClick={(evt: MouseEvent) => {
                                            const totalPages = Math.ceil(dataSource.children.length / PAGE_SIZE);
                                            if (currentPage === totalPages) {
                                                if (!isFetching) {
                                                    evt.stopPropagation();
                                                    updateContent().then(() => {
                                                        setCurrentPage(currentPage + 1);
                                                    });
                                                }
                                            } else {
                                                setCurrentPage(currentPage + 1);
                                            }
                                        }}
                                        />
                                    </button>
                                );
                            }
                        }

                        return originalElement;
                    }}
                />
            </div>
        </div>
    );
}

export default React.memo(RemoteBrowser);
