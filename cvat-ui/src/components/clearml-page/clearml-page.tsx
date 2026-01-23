// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState, useEffect } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Select from 'antd/lib/select';
import notification from 'antd/lib/notification';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import Spin from 'antd/lib/spin';
import { CheckCircleOutlined, WarningOutlined, SyncOutlined, ProjectOutlined, FileOutlined, CloudDownloadOutlined, LinkOutlined } from '@ant-design/icons';

interface Project {
    id: string;
    name: string;
    description: string;
    created: string;
    user: string;
}

interface Task {
    id: string;
    name: string;
    type: string;
    status: string;
    created: string;
    user: string;
}

interface Artifact {
    name: string;
    type: string;
    mode: string;
    uri: string;
    hash?: string;
    size?: number;
    timestamp?: string;
    preview?: string;
    content_type?: string;
    model_id?: string;
    framework?: string;
    tags?: string[];
}

interface Props {
    // Add any props if needed
}

function ClearMLPageComponent(props: Props): JSX.Element {
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'none' | 'success' | 'failed'>('none');
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [projectTasks, setProjectTasks] = useState<Task[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [selectedTask, setSelectedTask] = useState<string | null>(null);
    const [taskArtifacts, setTaskArtifacts] = useState<Artifact[]>([]);
    const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
    const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);

    // ClearML Web UI URL helper functions
    const getClearMLBaseUrl = () => process.env.REACT_APP_CLEARML_WEB_URL || 'http://localhost:8083';

    const getClearMLProjectUrl = (projectId: string) => {
        return `${getClearMLBaseUrl()}/projects/${encodeURIComponent(projectId)}`;
    };

    const getClearMLTaskUrl = (taskId: string) => {
        return `${getClearMLBaseUrl()}/projects/*/experiments/${encodeURIComponent(taskId)}`;
    };

    // Auto-connect on component mount
    useEffect(() => {
        handleConnectToClearML();
    }, []);

    const handleConnectToClearML = async (): Promise<void> => {
        setIsConnecting(true);
        setConnectionStatus('none');

        try {
            // The ClearML API is available at port 8500 as specified in the text
            const response = await fetch(`${getClearMLApiUrl()}/debug.ping`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            if (response.ok) {
                const data = await response.json();
                if (data.data) {
                    notification.success({
                        message: 'ClearML Connection Successful',
                        description: 'Successfully connected to the ClearML server.',
                        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    });
                    setConnectionStatus('success');

                    // Automatically fetch projects after successful connection
                    await fetchClearMLProjects();
                } else {
                    throw new Error('ClearML service reported unhealthy status');
                }
            } else {
                throw new Error(`Failed to connect: ${response.statusText}`);
            }
        } catch (error) {
            notification.error({
                message: 'ClearML Connection Failed',
                description: `Could not connect to ClearML: ${error instanceof Error ? error.message : String(error)}`,
                icon: <WarningOutlined style={{ color: '#ff4d4f' }} />
            });
            setConnectionStatus('failed');
        } finally {
            setIsConnecting(false);
        }
    };

    const getAuthHeader = () => {
        const accessKey = process.env.REACT_APP_CLEARML_ACCESS_KEY || '';
        const secretKey = process.env.REACT_APP_CLEARML_SECRET_KEY || '';
        // Encode the credentials to Base64
        const encoded = btoa(`${accessKey}:${secretKey}`);
        return { 'Authorization': `Basic ${encoded}` };
    };

    const getClearMLApiUrl = () => process.env.REACT_APP_CLEARML_API_URL || 'http://localhost:8008';

    const fetchClearMLProjects = async (): Promise<void> => {
        if (connectionStatus !== 'success' && !isConnecting) {
            notification.info({
                message: 'Connection Required',
                description: 'Please connect to ClearML first before fetching projects.',
            });
            return;
        }

        setIsLoadingProjects(true);

        try {
            const response = await fetch(`${getClearMLApiUrl()}/projects.get_all`, {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader() // Add this line
                },
                body: JSON.stringify({
                    "order_by": ["name"],
                    "search_text": ""
                })
            });
            if (response.ok) {
                const data = await response.json();
                setProjects(data.data?.projects || []);

                notification.success({
                    message: 'Projects Loaded',
                    description: `Successfully loaded ${data.projects?.length || 0} ClearML projects.`,
                });
            } else {
                const errorText = await response.text();
                throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText} - ${errorText}`);
            }
        } catch (error) {
            notification.error({
                message: 'Failed to Load Projects',
                description: `Error loading ClearML projects: ${error instanceof Error ? error.message : String(error)}`,
            });
            setProjects([]);
        } finally {
            setIsLoadingProjects(false);
        }
    };

    const fetchProjectTasks = async (projectName: string): Promise<void> => {
        setIsLoadingTasks(true);
        setSelectedProject(projectName);
        setSelectedTask(null); // Reset task selection
        setTaskArtifacts([]); // Clear artifacts
        setSelectedArtifact(null); // Clear artifact selection

        try {
            const response = await fetch(`${getClearMLApiUrl()}/tasks.get_all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project: [projectName],
                only_fields: ["id", "name", "status", "type", "last_update"] // Optional: limits data size
            })
        });
            if (response.ok) {
                const data = await response.json();
                setProjectTasks(data.data?.tasks || []);

                notification.success({
                    message: 'Tasks Loaded',
                    description: `Successfully loaded ${data.tasks?.length || 0} tasks from project "${projectName}".`,
                });
            } else {
                const errorText = await response.text();
                throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText} - ${errorText}`);
            }
        } catch (error) {
            notification.error({
                message: 'Failed to Load Tasks',
                description: `Error loading tasks: ${error instanceof Error ? error.message : String(error)}`,
            });
            setProjectTasks([]);
        } finally {
            setIsLoadingTasks(false);
        }
    };

    const fetchTaskArtifacts = async (projectName: string, taskId: string, taskName: string): Promise<void> => {
        setIsLoadingArtifacts(true);
        setSelectedTask(taskId);
        setSelectedArtifact(null); // Clear artifact selection

        try {
            const response = await fetch(`${getClearMLApiUrl()}/projects/${encodeURIComponent(projectName)}/tasks/${encodeURIComponent(taskId)}/artifacts`);
            if (response.ok) {
                const data = await response.json();
                setTaskArtifacts(data.artifacts || []);

                notification.success({
                    message: 'Artifacts Loaded',
                    description: `Successfully loaded ${data.artifacts?.length || 0} artifacts from task "${taskName}".`,
                });
            } else {
                const errorText = await response.text();
                throw new Error(`Failed to fetch artifacts: ${response.status} ${response.statusText} - ${errorText}`);
            }
        } catch (error) {
            notification.error({
                message: 'Failed to Load Artifacts',
                description: `Error loading artifacts: ${error instanceof Error ? error.message : String(error)}`,
            });
            setTaskArtifacts([]);
        } finally {
            setIsLoadingArtifacts(false);
        }
    };

    return (
        <div className='cvat-clearml-page'>
            <div className='clearml-main-content'>
                {isConnecting && (
                    <Row style={{ marginBottom: 16 }}>
                        <Col span={24}>
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <Spin size="large" />
                                <div style={{ marginTop: 8 }}>
                                    <Text>Connecting to ClearML server...</Text>
                                </div>
                            </div>
                        </Col>
                    </Row>
                )}

                {connectionStatus === 'failed' && (
                    <Row style={{ marginBottom: 16 }}>
                        <Col span={24}>
                            <div style={{
                                background: '#fff2f0',
                                border: '1px solid #ffccc7',
                                borderRadius: '6px',
                                padding: '12px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <WarningOutlined style={{ color: '#ff4d4f' }} />
                                <Text>Connection failed - Please check if ClearML server is running</Text>
                            </div>
                        </Col>
                    </Row>
                )}

                {connectionStatus === 'success' && (
                    <div style={{ padding: '0 40px' }}>
                        {/* Projects Section - Top */}
                        <Row style={{ marginBottom: '24px' }}>
                            <Col span={24}>
                                <div style={{
                                    background: '#fff',
                                    border: '1px solid #d9d9d9',
                                    borderRadius: '6px',
                                    padding: '16px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '16px'
                                    }}>
                                        <Title level={4} style={{ margin: 0 }}>
                                            <ProjectOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                                            Projects
                                        </Title>
                                        <Button
                                            onClick={fetchClearMLProjects}
                                            loading={isLoadingProjects}
                                            icon={<SyncOutlined />}
                                            size="small"
                                        >
                                            Refresh
                                        </Button>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        {projects.length > 0 ? (
                                            <div>
                                                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                                                    Found {projects.length} project{projects.length !== 1 ? 's' : ''}
                                                </Text>
                                                <div style={{
                                                    maxHeight: '300px',
                                                    overflowY: 'auto',
                                                    border: '1px solid #f0f0f0',
                                                    borderRadius: '4px'
                                                }}>
                                                    {projects.map((project: Project) => (
                                                        <div
                                                            key={project.id}
                                                            onClick={() => fetchProjectTasks(project.name)}
                                                            style={{
                                                                padding: '12px 16px',
                                                                borderBottom: '1px solid #f0f0f0',
                                                                cursor: 'pointer',
                                                                background: selectedProject === project.name ? '#e6f7ff' : 'transparent',
                                                                transition: 'background-color 0.3s'
                                                            }}
                                                            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                                                                if (selectedProject !== project.name) {
                                                                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                                                                }
                                                            }}
                                                            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                                                                if (selectedProject !== project.name) {
                                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                                }
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <Text strong style={{ color: '#262626' }}>
                                                                        {project.name}
                                                                    </Text>
                                                                    {project.description && (
                                                                        <div style={{ marginTop: '4px' }}>
                                                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                                                {project.description}
                                                                            </Text>
                                                                        </div>
                                                                    )}
                                                                    <div style={{ marginTop: '4px' }}>
                                                                        <Text type="secondary" style={{ fontSize: '11px' }}>
                                                                            Created: {new Date(project.created).toLocaleDateString()}
                                                                        </Text>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    size="small"
                                                                    icon={<LinkOutlined />}
                                                                    onClick={(e: React.MouseEvent) => {
                                                                        e.stopPropagation();
                                                                        window.open(getClearMLProjectUrl(project.id), '_blank');
                                                                    }}
                                                                    title="View project in ClearML"
                                                                    style={{ marginLeft: '8px' }}
                                                                >
                                                                    View in ClearML
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                                <Text type="secondary">
                                                    {isLoadingProjects ? 'Loading projects...' : 'No projects found'}
                                                </Text>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Col>
                        </Row>

                        {/* Tasks Section - Bottom */}
                        {selectedProject && (
                            <Row>
                                <Col span={24}>
                                    <div style={{
                                        background: '#fff',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '6px',
                                        padding: '16px'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '16px'
                                        }}>
                                            <Title level={4} style={{ margin: 0 }}>
                                                Tasks in "{selectedProject}"
                                            </Title>
                                            {isLoadingTasks && <Spin />}
                                        </div>

                                        {projectTasks.length > 0 ? (
                                            <div style={{
                                                maxHeight: '400px',
                                                overflowY: 'auto',
                                                border: '1px solid #f0f0f0',
                                                borderRadius: '4px'
                                            }}>
                                                {projectTasks.map((task: Task) => (
                                                    <div
                                                        key={task.id}
                                                        onClick={() => fetchTaskArtifacts(selectedProject, task.id, task.name)}
                                                        style={{
                                                            padding: '12px 16px',
                                                            borderBottom: '1px solid #f0f0f0',
                                                            cursor: 'pointer',
                                                            background: selectedTask === task.id ? '#e6f7ff' : 'transparent',
                                                            transition: 'background-color 0.3s'
                                                        }}
                                                        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                                                            if (selectedTask !== task.id) {
                                                                e.currentTarget.style.backgroundColor = '#f5f5f5';
                                                            }
                                                        }}
                                                        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                                                            if (selectedTask !== task.id) {
                                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                            }
                                                        }}
                                                    >
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'flex-start',
                                                            marginBottom: '8px'
                                                        }}>
                                                            <div style={{ flex: 1 }}>
                                                                <Text strong style={{ fontSize: '14px', color: '#262626' }}>
                                                                    {task.name}
                                                                </Text>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{
                                                                    padding: '2px 8px',
                                                                    borderRadius: '12px',
                                                                    fontSize: '11px',
                                                                    fontWeight: 500,
                                                                    textTransform: 'uppercase',
                                                                    backgroundColor:
                                                                        task.status.toLowerCase() === 'completed' ? '#f6ffed' :
                                                                        task.status.toLowerCase() === 'running' ? '#e6f7ff' :
                                                                        task.status.toLowerCase() === 'failed' ? '#fff2f0' : '#fef3c7',
                                                                    color:
                                                                        task.status.toLowerCase() === 'completed' ? '#52c41a' :
                                                                        task.status.toLowerCase() === 'running' ? '#1890ff' :
                                                                        task.status.toLowerCase() === 'failed' ? '#ff4d4f' : '#faad14',
                                                                    border:
                                                                        task.status.toLowerCase() === 'completed' ? '1px solid #b7eb8f' :
                                                                        task.status.toLowerCase() === 'running' ? '1px solid #91d5ff' :
                                                                        task.status.toLowerCase() === 'failed' ? '1px solid #ffccc7' : '1px solid #ffd666'
                                                                }}>
                                                                    {task.status}
                                                                </span>
                                                                <Button
                                                                    size="small"
                                                                    icon={<LinkOutlined />}
                                                                    onClick={(e: React.MouseEvent) => {
                                                                        e.stopPropagation();
                                                                        window.open(getClearMLTaskUrl(task.id), '_blank');
                                                                    }}
                                                                    title="View task in ClearML"
                                                                >
                                                                    View in ClearML
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                                                                Type: {task.type}
                                                            </Text>
                                                            <Text type="secondary" style={{ fontSize: '11px' }}>
                                                                Created: {new Date(task.created).toLocaleDateString()} • User: {task.user}
                                                            </Text>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                                {isLoadingTasks ? (
                                                    <div>
                                                        <Spin size="large" />
                                                        <div style={{ marginTop: '12px' }}>
                                                            <Text>Loading tasks...</Text>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <Text>No tasks available</Text>
                                                        <div style={{ marginTop: '8px' }}>
                                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                                This project is empty or tasks haven't been created yet.
                                                            </Text>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Col>
                            </Row>
                        )}

                        {/* Artifacts Section - Bottom */}
                        {selectedTask && (
                            <Row style={{ marginTop: '24px' }}>
                                <Col span={24}>
                                    <div style={{
                                        background: '#fff',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '6px',
                                        padding: '16px'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '16px'
                                        }}>
                                            <Title level={4} style={{ margin: 0 }}>
                                                <FileOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                                                Available Models & Artifacts
                                            </Title>
                                            {isLoadingArtifacts && <Spin />}
                                        </div>

                                        {taskArtifacts.length > 0 ? (
                                            <div>
                                                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                                                    Found {taskArtifacts.length} artifact{taskArtifacts.length !== 1 ? 's' : ''}
                                                </Text>
                                                <div style={{
                                                    maxHeight: '300px',
                                                    overflowY: 'auto',
                                                    border: '1px solid #f0f0f0',
                                                    borderRadius: '4px'
                                                }}>
                                                    {taskArtifacts.map((artifact: Artifact, index: number) => (
                                                        <div
                                                            key={`${artifact.name}-${index}`}
                                                            onClick={() => setSelectedArtifact(selectedArtifact === artifact.name ? null : artifact.name)}
                                                            style={{
                                                                padding: '12px 16px',
                                                                borderBottom: '1px solid #f0f0f0',
                                                                cursor: 'pointer',
                                                                background: selectedArtifact === artifact.name ? '#e6f7ff' : 'transparent',
                                                                transition: 'background-color 0.3s'
                                                            }}
                                                            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                                                                if (selectedArtifact !== artifact.name) {
                                                                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                                                                }
                                                            }}
                                                            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                                                                if (selectedArtifact !== artifact.name) {
                                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                                }
                                                            }}
                                                        >
                                                            <div style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'flex-start',
                                                                marginBottom: '8px'
                                                            }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <Text strong style={{ fontSize: '14px', color: '#262626' }}>
                                                                        {artifact.type === 'model' ? '🤖' : '📄'} {artifact.name}
                                                                    </Text>
                                                                    {artifact.framework && (
                                                                        <span style={{
                                                                            marginLeft: '8px',
                                                                            padding: '2px 6px',
                                                                            borderRadius: '8px',
                                                                            fontSize: '10px',
                                                                            fontWeight: 500,
                                                                            backgroundColor: '#f0f2f5',
                                                                            color: '#595959'
                                                                        }}>
                                                                            {artifact.framework}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: '12px',
                                                                        fontSize: '11px',
                                                                        fontWeight: 500,
                                                                        textTransform: 'uppercase',
                                                                        backgroundColor: artifact.type === 'model' ? '#e6f7ff' : '#f6ffed',
                                                                        color: artifact.type === 'model' ? '#1890ff' : '#52c41a',
                                                                        border: artifact.type === 'model' ? '1px solid #91d5ff' : '1px solid #b7eb8f'
                                                                    }}>
                                                                        {artifact.type}
                                                                    </span>
                                                                    {artifact.uri && (
                                                                        <Button
                                                                            size="small"
                                                                            icon={<CloudDownloadOutlined />}
                                                                            onClick={(e: React.MouseEvent) => {
                                                                                e.stopPropagation();
                                                                                window.open(artifact.uri, '_blank');
                                                                            }}
                                                                            title="Download artifact"
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                                                                    Mode: {artifact.mode} • Type: {artifact.content_type || artifact.type}
                                                                </Text>
                                                                {artifact.size && (
                                                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                                                        Size: {(artifact.size / (1024 * 1024)).toFixed(2)} MB
                                                                    </Text>
                                                                )}
                                                                {artifact.timestamp && (
                                                                    <Text type="secondary" style={{ fontSize: '11px', marginLeft: artifact.size ? ' • ' : '' }}>
                                                                        Created: {new Date(artifact.timestamp).toLocaleDateString()}
                                                                    </Text>
                                                                )}
                                                                {artifact.preview && (
                                                                    <div style={{ marginTop: '4px' }}>
                                                                        <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic' }}>
                                                                            {artifact.preview}
                                                                        </Text>
                                                                    </div>
                                                                )}
                                                                {selectedArtifact === artifact.name && (
                                                                    <div style={{
                                                                        marginTop: '12px',
                                                                        padding: '12px',
                                                                        background: '#fafafa',
                                                                        borderRadius: '4px',
                                                                        border: '1px solid #e8e8e8'
                                                                    }}>
                                                                        <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                                                                            Artifact Details:
                                                                        </Text>
                                                                        <div style={{ fontSize: '11px' }}>
                                                                            {artifact.model_id && (
                                                                                <div><strong>Model ID:</strong> {artifact.model_id}</div>
                                                                            )}
                                                                            {artifact.hash && (
                                                                                <div><strong>Hash:</strong> {artifact.hash.substring(0, 16)}...</div>
                                                                            )}
                                                                            {artifact.uri && (
                                                                                <div><strong>URI:</strong> {artifact.uri}</div>
                                                                            )}
                                                                            {artifact.tags && artifact.tags.length > 0 && (
                                                                                <div><strong>Tags:</strong> {artifact.tags.join(', ')}</div>
                                                                            )}
                                                                        </div>
                                                                        {artifact.type === 'model' && (
                                                                            <div style={{ marginTop: '8px' }}>
                                                                                <Button
                                                                                    type="primary"
                                                                                    size="small"
                                                                                    onClick={() => {
                                                                                        notification.success({
                                                                                            message: 'Model Selected',
                                                                                            description: `Selected model: ${artifact.name}`,
                                                                                        });
                                                                                    }}
                                                                                >
                                                                                    Use This Model
                                                                                </Button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                                {isLoadingArtifacts ? (
                                                    <div>
                                                        <Spin size="large" />
                                                        <div style={{ marginTop: '12px' }}>
                                                            <Text>Loading artifacts...</Text>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <Text>No artifacts available</Text>
                                                        <div style={{ marginTop: '8px' }}>
                                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                                This task has no trained models or artifacts yet.
                                                            </Text>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Col>
                            </Row>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export const ClearMLPage = React.memo(ClearMLPageComponent);
export default ClearMLPage;
