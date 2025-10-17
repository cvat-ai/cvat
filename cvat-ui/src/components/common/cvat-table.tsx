// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Table, { TableProps } from 'antd/lib/table';
import Input from 'antd/lib/input';
import Text from 'antd/lib/typography/Text';
import Button from 'antd/lib/button';
import Space from 'antd/lib/space';
import Popover from 'antd/lib/popover';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import { DownloadOutlined, MoreOutlined } from '@ant-design/icons';
import { Config } from '@react-awesome-query-builder/antd';
import jsonLogic from 'json-logic-js';

import { ResourceFilterHOC, defaultVisibility } from 'components/resource-sorting-filtering';
import CVATTooltip from './cvat-tooltip';

type Props = TableProps & {
    onFilterDataSource?(data: TableProps['dataSource']): void;
    onChangeColumnVisibility?(id: number, isHidden: boolean): void;
    renderExtraActions?(): JSX.Element;
    queryBuilder?: {
        config: Partial<Config>;
        memoryKey: string;
        memoryCapacity?: number;
        predefinedQueries?: Record<string, string>;
    }
    csvExport?: {
        filename: string;
    };
    tableTitle?: string | React.ReactNode;
    searchDataIndex?: (string | string[])[];
};

function stringifyDataIndex(dataIndex: string | string[]): string {
    return [dataIndex].flat(Number.MAX_SAFE_INTEGER).join('.');
}

function getValueFromDataItem<T>(
    dataItem: NonNullable<TableProps['dataSource']>[0],
    dataIndex: string | string[],
): T | null {
    if (Array.isArray(dataIndex)) {
        return dataIndex.reduce((acc: unknown, path: string) => (
            typeof acc === 'object' && acc ? (acc as Record<string, unknown>)[path] : null
        ), dataItem) as T;
    }
    return dataItem[dataIndex];
}

/*
    Enhanced table component
    Supports:
    * titles
    * advanced filtration with json query
    * overall search
    * csv export (column must have dataIndex to be CSV-exportable)
    * show/hide columns
*/
function CVATTable(props: Props): JSX.Element {
    const {
        onChangeColumnVisibility,
        onFilterDataSource,
        renderExtraActions,
        queryBuilder,
        searchDataIndex,
        tableTitle,
        dataSource,
        csvExport,
        columns,
        ...rest
    } = props;

    const [FilteringComponent, setFilteringComponent] = useState<ReturnType<typeof ResourceFilterHOC> | null>(null);
    const [filterValue, setFilterValue] = useState<string | null>(null);
    const [searchPhrase, setSearchPhrase] = useState<string | null>(null);
    const [visibility, setVisibility] = useState(defaultVisibility);
    const [filteredDataSource, setFilteredDataSource] = useState<typeof dataSource>(dataSource);
    const [modifiedColumns, setModifiedColumns] = useState<NonNullable<typeof columns>>([]);

    const downloadCSV = useCallback(() => {
        if (csvExport && columns) {
            // function to export as CSV properly handling commas, line breaks and double quotes in both header/fields
            const header = columns
                .filter((column: any) => !!column.dataIndex).map((column: any) => ({
                    title: stringifyDataIndex(column.dataIndex),
                    dataIndex: column.dataIndex as string | string[],
                }));

            let csv = '';
            if (filteredDataSource) {
                const rows = filteredDataSource
                    .map((dataItem) => header.map(({ dataIndex }) => {
                        const value = getValueFromDataItem<string>(dataItem, dataIndex);
                        if (typeof value === 'string') {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    }).join(','));
                csv = `${header.map((column) => column.title).join(',')}\n${rows.join('\n')}`;
            } else {
                csv = header.map((column) => column.title).join(',');
            }

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');

            try {
                a.setAttribute('href', url);
                a.setAttribute('download', csvExport.filename);
                a.click();
            } finally {
                a.remove();
            }
        }
    }, [csvExport?.filename, filteredDataSource, columns]);

    useEffect(() => {
        if (columns) {
            setModifiedColumns(columns);
        }
    }, [columns]);

    useEffect(() => {
        if (dataSource) {
            let filtered = dataSource;
            if (filterValue) {
                const parsed = JSON.parse(filterValue);
                filtered = filtered.filter((dataItem: object) => jsonLogic.apply(parsed, dataItem));
            }

            if (searchPhrase && searchDataIndex) {
                const lowerCaseQuery = searchPhrase.toLowerCase();
                filtered = filtered.filter((dataItem) => {
                    for (const dataIndex of searchDataIndex) {
                        const value = getValueFromDataItem<string>(dataItem, dataIndex);
                        if (typeof value === 'string' && value.toLowerCase().includes(lowerCaseQuery)) {
                            return true;
                        }
                    }
                    return false;
                });
            }

            setFilteredDataSource(filtered);
            if (onFilterDataSource) {
                onFilterDataSource(filtered);
            }
        }
    }, [dataSource, searchDataIndex, filterValue, searchPhrase]);

    useEffect(() => {
        if (queryBuilder?.config && queryBuilder?.memoryKey) {
            const capacity = queryBuilder?.memoryCapacity ?? 0;
            setFilteringComponent(
                ResourceFilterHOC(
                    queryBuilder.config,
                    queryBuilder.memoryKey,
                    capacity,
                    queryBuilder.predefinedQueries ?? undefined,
                ),
            );
        }
    }, [queryBuilder]);

    return (
        <div className='cvat-table-wrapper'>
            <Row align='middle'>
                <Col>
                    <Space align='center'>
                        {!!tableTitle && (
                            <div className='cvat-text-color cvat-table-header'>
                                {typeof tableTitle === 'string' ? (
                                    <Text strong>{tableTitle}</Text>
                                ) : (
                                    tableTitle
                                )}
                            </div>
                        )}
                        { !!csvExport && !!columns && (
                            <Button
                                className='cvat-table-export-csv-button'
                                type='link'
                                icon={<DownloadOutlined />}
                                onClick={downloadCSV}
                            />
                        ) }
                    </Space>
                </Col>
                <Col flex='auto'>
                    { !!renderExtraActions && renderExtraActions() }
                </Col>
                <Col>
                    <Space align='center'>
                        {Array.isArray(searchDataIndex) && !!searchDataIndex.length && (
                            <CVATTooltip
                                title={`Search across fields: ${searchDataIndex
                                    .map((dataIndex) => stringifyDataIndex(dataIndex)).join(', ')}`}
                            >
                                <Input.Search
                                    className='cvat-table-search-bar'
                                    placeholder='Search ..'
                                    onSearch={setSearchPhrase}
                                    enterButton
                                />
                            </CVATTooltip>
                        )}
                        <div>
                            { FilteringComponent !== null && (
                                <FilteringComponent
                                    value={null}
                                    predefinedVisible={visibility.predefined}
                                    builderVisible={visibility.builder}
                                    recentVisible={visibility.recent}
                                    onPredefinedVisibleChange={(visible: boolean) => (
                                        setVisibility({ ...defaultVisibility, predefined: visible })
                                    )}
                                    onBuilderVisibleChange={(visible: boolean) => (
                                        setVisibility({ ...defaultVisibility, builder: visible })
                                    )}
                                    onRecentVisibleChange={(visible: boolean) => (
                                        setVisibility({
                                            ...defaultVisibility,
                                            builder: visibility.builder,
                                            recent: visible,
                                        })
                                    )}
                                    onApplyFilter={setFilterValue}
                                />
                            )}
                        </div>
                        <Popover
                            placement='right'
                            trigger={['click']}
                            content={() => {
                                const items = modifiedColumns.map((column, idx: number) => (
                                    <Checkbox
                                        key={idx}
                                        onChange={(e: CheckboxChangeEvent) => {
                                            const newIsHidden = !e.target.checked;
                                            setModifiedColumns([
                                                ...modifiedColumns.slice(0, idx),
                                                {
                                                    ...column,
                                                    hidden: newIsHidden,
                                                },
                                                ...modifiedColumns.slice(idx + 1),
                                            ]);

                                            if (onChangeColumnVisibility) {
                                                onChangeColumnVisibility(idx, newIsHidden);
                                            }
                                        }}
                                        checked={!(column.hidden ?? false)}
                                    >
                                        {typeof column.title === 'function' ?
                                            column.title({}) : (column.title ?? '')}
                                    </Checkbox>
                                ));

                                return (
                                    <div className='cvat-table-columns-settings-menu'>
                                        {items}
                                    </div>
                                );
                            }}
                        >
                            <MoreOutlined />
                        </Popover>
                    </Space>
                </Col>
            </Row>
            <Table
                {...rest}
                columns={modifiedColumns}
                dataSource={filteredDataSource}
            />
        </div>
    );
}

export default React.memo(CVATTable);
