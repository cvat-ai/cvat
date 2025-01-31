// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { Col, Row } from 'antd/lib/grid';
import Input from 'antd/lib/input';
import Text from 'antd/lib/typography/Text';
import { DownloadOutlined } from '@ant-design/icons/lib/icons';

interface TableHeaderProps {
    title: string;
    onSearch?: (query: string) => void;
    onDownload: () => { filename: string, data: Array<{ [key: string]: any }> };
    actions?: React.ReactNode;
}

function convertArrayToCSV(data: Array<{ [key: string]: any }>): string {
    const header = Object.keys(data[0]).join(',');
    const rows = data.map((obj) => Object.values(obj).join(',')).join('\n');
    return `${header}\n${rows}`;
}

function downloadCSV(data: Array<{ [key: string]: any }>, filename: string): void {
    const csv = convertArrayToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    a.click();
}

function QualityTableHeader(props: TableHeaderProps): JSX.Element {
    const {
        title, onSearch, onDownload, actions,
    } = props;

    const handleDownload = () => {
        if (onDownload) {
            const { filename, data } = onDownload();
            downloadCSV(data, filename);
        }
    };

    return (
        <Row justify='start' align='middle' className='cvat-quality-table-header'>
            <Col>
                <Text className='cvat-text-color cvat-quality-table-header-title'>{title}</Text>
            </Col>
            <Col>
                <DownloadOutlined className='cvat-quality-table-dowload-button' onClick={handleDownload} />
            </Col>
            <Col>{actions}</Col>
            {!!onSearch && (
                <Col flex='auto'>
                    <Row justify='end'>
                        <Col span={8} className='cvat-quality-table-search-wrapper'>
                            <Input.Search
                                enterButton
                                onSearch={onSearch}
                                className='cvat-quality-table-search-bar'
                                placeholder='Search ...'
                            />
                        </Col>
                    </Row>
                </Col>
            )}
        </Row>
    );
}

export default React.memo(QualityTableHeader);
