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
    tableTitle?: string;
    searchDataIndex?: (string | string[])[];
};

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
    * csv export
    * show/hide columns
    Current restrictions:
    * queryBuilder prop is supposed to be static
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
    const [modifiedColumns, setModifiedColumns] = useState<typeof columns>([]);

    const downloadCSV = useCallback(() => {
        if (csvExport && columns) {
            // function to export as CSV properly handling commas, line breaks and double quotes in both header/fields
            const header = columns.map((column: any) => ({
                title: column.dataIndex ? `${[column.dataIndex as string | string[]].flat().join('.')}` : undefined,
                dataIndex: (column as any).dataIndex as string | string[],
            })).filter((column) => !!column.title);

            let csv = '';
            if (dataSource) {
                const rows = dataSource
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
    }, [csvExport?.filename, dataSource, columns]);

    useEffect(() => {
        setModifiedColumns(columns);
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
        if (!FilteringComponent) {
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
        }
    }, [queryBuilder, FilteringComponent]);

    return (
        <div className='cvat-table-wrapper'>
            <Row justify='space-between' align='middle'>
                <Col>
                    <Space align='center'>
                        {!!tableTitle && <Text strong className='cvat-text-color cvat-table-header'>{tableTitle}</Text> }
                        { !!csvExport && !!columns && (
                            <Button
                                className='cvat-table-export-csv-button'
                                type='link'
                                icon={<DownloadOutlined />}
                                onClick={downloadCSV}
                            />
                        ) }
                        { !!renderExtraActions && renderExtraActions() }
                    </Space>
                </Col>
                <Col>
                    <Space align='center'>
                        {Array.isArray(searchDataIndex) && !!searchDataIndex.length && (
                            <Input.Search
                                className='cvat-table-search-bar'
                                placeholder='Search ..'
                                onSearch={setSearchPhrase}
                                enterButton
                            />
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
                                const items = modifiedColumns?.map((column, idx: number) => {
                                    const isHidden = column.hidden ?? false;
                                    return (
                                        <Checkbox
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
                                            checked={!isHidden}
                                        >
                                            {column.title as string}
                                        </Checkbox>
                                    );
                                });

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
