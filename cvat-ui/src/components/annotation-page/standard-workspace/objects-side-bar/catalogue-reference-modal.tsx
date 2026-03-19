// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './catalogue-reference-modal.scss';

import React, { useState, useEffect, useMemo } from 'react';
import Modal from 'antd/lib/modal';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import Card from 'antd/lib/card';
import Table from 'antd/lib/table';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Segmented from 'antd/lib/segmented';
import Badge from 'antd/lib/badge';
import Spin from 'antd/lib/spin';
import Alert from 'antd/lib/alert';
import {
    SearchOutlined, AppstoreOutlined, UnorderedListOutlined,
    StopOutlined, WarningOutlined, DashboardOutlined,
    CloseCircleOutlined, UserOutlined, ArrowRightOutlined,
    CarOutlined, BorderOutlined,
} from '@ant-design/icons';

interface CatalogueItem {
    reference: string;
    iconPath: string;
    description: string;
}

interface CatalogueItemWithConfidence extends CatalogueItem {
    confidence: number;
}

interface Props {
    visible: boolean;
    catalogueName: string;
    currentValue: string;
    onSelect: (reference: string) => void;
    onCancel: () => void;
}

// Map of icon paths to Ant Design icons (for demo purposes)
const iconMap: Record<string, React.ReactNode> = {
    '/catalogue/icons/stop_sign.png': <StopOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />,
    '/catalogue/icons/yield_sign.png': <WarningOutlined style={{ fontSize: 32, color: '#faad14' }} />,
    '/catalogue/icons/speed_limit_30.png': <DashboardOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
    '/catalogue/icons/speed_limit_50.png': <DashboardOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
    '/catalogue/icons/no_entry.png': <CloseCircleOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />,
    '/catalogue/icons/pedestrian_crossing.png': <UserOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
    '/catalogue/icons/no_parking.png': <BorderOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />,
    '/catalogue/icons/one_way.png': <ArrowRightOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
};

const defaultIcon = <CarOutlined style={{ fontSize: 32, color: '#8c8c8c' }} />;

function CatalogueReferenceModal(props: Props): JSX.Element {
    const {
        visible, catalogueName, currentValue, onSelect, onCancel,
    } = props;

    const [catalogueData, setCatalogueData] = useState<CatalogueItemWithConfidence[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [searchText, setSearchText] = useState<string>('');
    const [selectedReference, setSelectedReference] = useState<string>(currentValue);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    useEffect(() => {
        if (visible) {
            setSearchText('');
            fetchCatalogueData();
        }
    }, [visible, catalogueName]);

    useEffect(() => {
        if (visible) {
            // Parse confidence scores from currentValue and update selected reference
            const confidenceMap = parseConfidenceScores(currentValue);
            const references = Object.keys(confidenceMap);

            // If there are confidence scores, select the highest confidence one
            // Otherwise use the current value as-is
            if (references.length > 0) {
                const sortedRefs = references.sort((a, b) => confidenceMap[b] - confidenceMap[a]);
                setSelectedReference(sortedRefs[0]);
            } else {
                setSelectedReference(currentValue);
            }
        }
    }, [visible, currentValue]);

    const parseConfidenceScores = (value: string): Record<string, number> => {
        const confidenceMap: Record<string, number> = {};

        if (!value) {
            return confidenceMap;
        }

        // If no colon, treat as single reference with confidence 1.0
        if (!value.includes(':')) {
            const reference = value.trim();
            if (reference) {
                confidenceMap[reference] = 1.0;
            }
            return confidenceMap;
        }

        // Split by semicolon to get individual entries
        const entries = value.split(';').map((entry) => entry.trim()).filter((entry) => entry);

        for (const entry of entries) {
            // Split by colon to get reference and confidence
            const parts = entry.split(':');
            if (parts.length === 2) {
                const reference = parts[0].trim();
                const confidence = parseFloat(parts[1]);
                if (!Number.isNaN(confidence)) {
                    confidenceMap[reference] = confidence;
                }
            }
        }

        return confidenceMap;
    };

    const fetchCatalogueData = async (): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/catalogue/${catalogueName}.json`);
            if (!response.ok) {
                throw new Error(`Catalogue "${catalogueName}" not found`);
            }
            const data: CatalogueItem[] = await response.json();

            // Parse confidence scores from currentValue
            const confidenceMap = parseConfidenceScores(currentValue);

            // Add confidence to each item (0 if not in confidence map)
            const dataWithConfidence: CatalogueItemWithConfidence[] = data.map((item) => ({
                ...item,
                confidence: confidenceMap[item.reference] ?? 0,
            }));

            // Sort by confidence (descending)
            dataWithConfidence.sort((a, b) => b.confidence - a.confidence);

            setCatalogueData(dataWithConfidence);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load catalogue');
            setCatalogueData([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        if (!searchText) return catalogueData;

        const lowerSearch = searchText.toLowerCase();
        return catalogueData.filter(
            (item) => item.reference.toLowerCase().includes(lowerSearch) ||
                item.description.toLowerCase().includes(lowerSearch),
        );
    }, [catalogueData, searchText]);

    const handleSelect = (): void => {
        if (selectedReference) {
            // Return just the reference, not the confidence scores
            onSelect(selectedReference);
        }
    };

    const handleItemClick = (reference: string): void => {
        setSelectedReference(reference);
    };

    const handleItemDoubleClick = (reference: string): void => {
        setSelectedReference(reference);
        onSelect(reference);
    };

    const getConfidenceColor = (confidence: number): string => {
        if (confidence >= 0.9) return '#52c41a';
        if (confidence >= 0.8) return '#1890ff';
        if (confidence >= 0.7) return '#faad14';
        return '#ff4d4f';
    };

    const renderGridView = (): JSX.Element => (
        <Row gutter={[16, 16]} className='cvat-catalogue-reference-grid'>
            {filteredData.map((item) => (
                <Col key={item.reference} xs={24} sm={12} md={8} lg={6}>
                    <Card
                        hoverable
                        className={`cvat-catalogue-item-card ${
                            selectedReference === item.reference ? 'cvat-catalogue-item-selected' : ''
                        }`}
                        onClick={() => handleItemClick(item.reference)}
                        onDoubleClick={() => handleItemDoubleClick(item.reference)}
                    >
                        <div className='cvat-catalogue-item-icon'>
                            {iconMap[item.iconPath] || defaultIcon}
                        </div>
                        <div className='cvat-catalogue-item-content'>
                            <Text strong className='cvat-catalogue-item-reference'>
                                {item.reference}
                            </Text>
                            <Text className='cvat-catalogue-item-description' ellipsis={{ tooltip: item.description }}>
                                {item.description}
                            </Text>
                            <div className='cvat-catalogue-item-confidence'>
                                <Badge
                                    color={getConfidenceColor(item.confidence)}
                                    text={`Confidence: ${(item.confidence * 100).toFixed(0)}%`}
                                />
                            </div>
                        </div>
                    </Card>
                </Col>
            ))}
        </Row>
    );

    const tableColumns = [
        {
            title: 'Icon',
            dataIndex: 'iconPath',
            key: 'icon',
            width: 80,
            render: (iconPath: string) => (
                <div className='cvat-catalogue-table-icon'>
                    {iconMap[iconPath] || defaultIcon}
                </div>
            ),
        },
        {
            title: 'Reference',
            dataIndex: 'reference',
            key: 'reference',
            sorter: (a: CatalogueItemWithConfidence, b: CatalogueItemWithConfidence) => a.reference.localeCompare(b.reference),
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            sorter: (a: CatalogueItemWithConfidence, b: CatalogueItemWithConfidence) => a.description.localeCompare(b.description),
        },
        {
            title: 'Confidence',
            dataIndex: 'confidence',
            key: 'confidence',
            width: 150,
            defaultSortOrder: 'descend' as const,
            sorter: (a: CatalogueItemWithConfidence, b: CatalogueItemWithConfidence) => a.confidence - b.confidence,
            render: (confidence: number) => (
                confidence > 0 ? (
                    <Badge
                        color={getConfidenceColor(confidence)}
                        text={`${(confidence * 100).toFixed(0)}%`}
                    />
                ) : (
                    <Text type='secondary'>N/A</Text>
                )
            ),
        },
    ];

    const renderTableView = (): JSX.Element => (
        <Table
            className='cvat-catalogue-reference-table'
            dataSource={filteredData}
            columns={tableColumns}
            rowKey='reference'
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['5', '10', '20', '50'] }}
            rowClassName={(record) => (
                selectedReference === record.reference ? 'cvat-catalogue-table-row-selected' : ''
            )}
            onRow={(record) => ({
                onClick: () => handleItemClick(record.reference),
                onDoubleClick: () => handleItemDoubleClick(record.reference),
            })}
        />
    );

    return (
        <Modal
            title={`Select from Catalogue: ${catalogueName}`}
            open={visible}
            onCancel={onCancel}
            width={900}
            className='cvat-catalogue-reference-modal'
            footer={[
                <Button key='cancel' onClick={onCancel}>
                    Cancel
                </Button>,
                <Button
                    key='select'
                    type='primary'
                    onClick={handleSelect}
                    disabled={!selectedReference}
                >
                    Select
                </Button>,
            ]}
        >
            <div className='cvat-catalogue-reference-modal-content'>
                {/* Search and View Toggle */}
                <Row gutter={16} className='cvat-catalogue-reference-controls'>
                    <Col flex='auto'>
                        <Input
                            placeholder='Search by reference or description...'
                            prefix={<SearchOutlined />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            allowClear
                        />
                    </Col>
                    <Col>
                        <Segmented
                            value={viewMode}
                            onChange={(value) => setViewMode(value as 'grid' | 'table')}
                            options={[
                                { label: 'Grid', value: 'grid', icon: <AppstoreOutlined /> },
                                { label: 'Table', value: 'table', icon: <UnorderedListOutlined /> },
                            ]}
                        />
                    </Col>
                </Row>

                {/* Content Area */}
                <div className='cvat-catalogue-reference-content'>
                    {loading && (
                        <div className='cvat-catalogue-reference-loading'>
                            <Spin size='large' tip='Loading catalogue...' />
                        </div>
                    )}

                    {error && (
                        <Alert
                            message='Error Loading Catalogue'
                            description={error}
                            type='error'
                            showIcon
                        />
                    )}

                    {!loading && !error && filteredData.length === 0 && (
                        <Alert
                            message='No Items Found'
                            description={searchText ? 'No items match your search criteria.' : 'This catalogue is empty.'}
                            type='info'
                            showIcon
                        />
                    )}

                    {!loading && !error && filteredData.length > 0 && (
                        viewMode === 'grid' ? renderGridView() : renderTableView()
                    )}
                </div>

                {/* Current Selection */}
                {selectedReference && (
                    <div className='cvat-catalogue-reference-selection'>
                        <Text type='secondary'>
                            Selected:
                            {' '}
                            <Text strong>{selectedReference}</Text>
                        </Text>
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default React.memo(CatalogueReferenceModal);
