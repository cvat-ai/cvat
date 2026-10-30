// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { Row, Col } from 'antd/lib/grid';
import Table, { TableProps } from 'antd/lib/table';
import Input from 'antd/lib/input';
import Text from 'antd/lib/typography/Text';
import Button from 'antd/lib/button';
import Space from 'antd/lib/space';
import Popover from 'antd/lib/popover';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import { DownloadOutlined, MoreOutlined, SearchOutlined } from '@ant-design/icons';
import { Config } from '@react-awesome-query-builder/antd';
import jsonLogic from 'json-logic-js';

import { ResourceFilterHOC, defaultVisibility } from 'components/resource-sorting-filtering';
import { generateCSV, downloadCSV as triggerCSVDownload } from 'utils/csv-writer';
import CVATTooltip from './cvat-tooltip';
import { useTableState } from './table-state';

type Props = TableProps & {
    stateKey?: string;
    onFilterDataSource?(data: TableProps['dataSource']): void;
    onChangeColumnVisibility?(id: number, isHidden: boolean): void;
    renderExtraActions?(): JSX.Element;
    renderHeaderActions?(): JSX.Element;
    columnVisibility?: {
        // Opt in when the parent owns columns[].hidden; change callbacks alone are notifications.
        controlled?: boolean;
        groups?: Record<string, {
            maxVisible?: number;
            hint?: string;
        }>;
    };
    queryBuilder?: {
        config: Partial<Config>;
        memoryKey: string;
        memoryCapacity?: number;
        predefinedQueries?: Record<string, string>;
        value?: string | null;
    }
    csvExport?: {
        filename: string;
    };
    tableTitle?: string | React.ReactNode;
    searchDataIndex?: (string | string[])[];
};

type CVATColumn = NonNullable<TableProps['columns']>[0] & { visibilityGroup?: string };

function columnKey(column: CVATColumn, position: string): string {
    const dataIndex = 'dataIndex' in column ? column.dataIndex : undefined;
    return String(column.key ?? (Array.isArray(dataIndex) ? dataIndex.join('.') : dataIndex) ?? position);
}

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
        stateKey,
        onChangeColumnVisibility,
        onFilterDataSource,
        renderExtraActions,
        renderHeaderActions,
        queryBuilder,
        searchDataIndex,
        tableTitle,
        dataSource,
        csvExport,
        columns,
        columnVisibility,
        ...rest
    } = props;

    const [FilteringComponent, setFilteringComponent] = useState<ReturnType<typeof ResourceFilterHOC> | null>(null);
    const stateField = (field: string): string | undefined => (stateKey ? `${stateKey}:${field}` : undefined);
    const suppliedFilter = queryBuilder?.value;
    const [filterState, setFilterState] = useTableState(stateField('filter'), {
        value: suppliedFilter ?? null,
        suppliedValue: suppliedFilter,
    });
    const suppliedFilterChanged = filterState.suppliedValue !== suppliedFilter;
    const filterValue = suppliedFilterChanged ? suppliedFilter ?? null : filterState.value;
    const setFilterValue = useCallback((value: string | null): void => {
        setFilterState({ value, suppliedValue: suppliedFilter });
    }, [setFilterState, suppliedFilter]);
    useEffect(() => {
        if (suppliedFilterChanged) setFilterValue(suppliedFilter ?? null);
    }, [suppliedFilterChanged, suppliedFilter, setFilterValue]);
    const [searchPhrase, setSearchPhrase] = useTableState<string | null>(stateField('search'), null);
    const [searchInput, setSearchInput] = useTableState(stateField('searchInput'), '');
    const [hiddenColumns, setHiddenColumns] = useTableState<Record<string, boolean>>(stateField('columns'), {});
    const [tableChange, setTableChange] = useTableState<{
        pagination?: Exclude<TableProps['pagination'], false>;
        filters?: Parameters<NonNullable<TableProps['onChange']>>[1];
        sorter?: { columnKey?: React.Key; order?: 'ascend' | 'descend' | null }[];
    }>(stateField('table'), {});
    const [visibility, setVisibility] = useState(defaultVisibility);
    const [columnSearchPhrase, setColumnSearchPhrase] = useState('');
    const [localVisibility, setLocalVisibility] = useState<{
        columns: typeof columns;
        values: Record<string, boolean>;
    }>({ columns, values: {} });

    const modifiedColumns = useMemo(() => {
        const hasControlledSort = (items: NonNullable<typeof columns>): boolean => items.some((column) => (
            'sortOrder' in column || ('children' in column && hasControlledSort(column.children))
        ));
        // Ant Design switches the entire table to controlled sorting when any column supplies sortOrder.
        const controlledSorting = hasControlledSort(columns ?? []);
        const updateColumns = (items: NonNullable<typeof columns>, parent = ''): NonNullable<typeof columns> => (
            items.map((column, index) => {
                const position = parent ? `${parent}-${index}` : String(index);
                const key = columnKey(column, position);
                const sorter = tableChange.sorter?.find((item) => String(item.columnKey) === key);
                let { hidden } = column;
                if (!columnVisibility?.controlled) {
                    if (stateKey) hidden = hiddenColumns[key] ?? hidden;
                    else if (localVisibility.columns === columns) hidden = localVisibility.values[key] ?? hidden;
                }
                return {
                    ...column,
                    ...('children' in column ? { children: updateColumns(column.children, position) } : {}),
                    hidden,
                    ...(stateKey ? {
                        key: column.key ?? key,
                        ...(!controlledSorting && tableChange.sorter ? {
                            sortOrder: sorter?.order ?? null,
                        } : {}),
                        ...(!('filteredValue' in column) && tableChange.filters ? {
                            filteredValue: tableChange.filters[key] ?? null,
                        } : {}),
                    } : {}),
                };
            })
        );
        return updateColumns(columns ?? []);
    }, [columns, hiddenColumns, tableChange, stateKey, columnVisibility?.controlled, localVisibility]);

    const filteredDataSource = useMemo(() => {
        if (!dataSource) return dataSource;
        let filtered = dataSource;
        if (filterValue) {
            const parsed = JSON.parse(filterValue);
            filtered = filtered.filter((dataItem: object) => jsonLogic.apply(parsed, dataItem));
        }

        if (searchPhrase && searchDataIndex) {
            const lowerCaseQuery = searchPhrase.toLowerCase();
            filtered = filtered.filter((dataItem) => searchDataIndex.some((dataIndex) => {
                const value = getValueFromDataItem<string>(dataItem, dataIndex);
                return typeof value === 'string' && value.toLowerCase().includes(lowerCaseQuery);
            }));
        }
        return filtered;
    }, [dataSource, searchDataIndex, filterValue, searchPhrase]);

    const onFilterDataSourceRef = useRef(onFilterDataSource);
    useEffect(() => {
        onFilterDataSourceRef.current = onFilterDataSource;
    }, [onFilterDataSource]);
    useEffect(() => {
        if (filteredDataSource) onFilterDataSourceRef.current?.(filteredDataSource);
    }, [filteredDataSource]);

    const handleDownloadCSV = useCallback(() => {
        if (csvExport && columns) {
            // Extract columns with dataIndex for CSV export
            const csvColumns = columns
                .filter((column: any) => !!column.dataIndex)
                .map((column: any) => ({
                    title: stringifyDataIndex(column.dataIndex),
                    accessor: (dataItem: any) => getValueFromDataItem<string>(dataItem, column.dataIndex),
                }));

            const csvContent = generateCSV([...(filteredDataSource || [])], csvColumns);

            triggerCSVDownload(csvContent, csvExport.filename);
        }
    }, [csvExport, filteredDataSource, columns]);

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
    }, [queryBuilder?.config, queryBuilder?.memoryKey, queryBuilder?.memoryCapacity, queryBuilder?.predefinedQueries]);

    const pagination = rest.pagination === false ? false : {
        ...rest.pagination,
        ...(stateKey ? {
            current: rest.pagination?.current ?? tableChange.pagination?.current,
            pageSize: rest.pagination?.pageSize ?? tableChange.pagination?.pageSize,
        } : {}),
    };
    const loading = typeof rest.loading === 'object' ? rest.loading.spinning !== false : !!rest.loading;
    const dataAvailable = dataSource != null && !loading;
    const controlledPage = rest.pagination !== false && rest.pagination?.current !== undefined;
    if (pagination && stateKey && pagination.current && dataAvailable && !controlledPage) {
        const leafColumns = (items: NonNullable<typeof columns>): NonNullable<typeof columns> => (
            items.flatMap((column) => ('children' in column ? leafColumns(column.children) : [column]))
        );
        const filterColumns = leafColumns(modifiedColumns);
        const count = pagination.total ?? (filteredDataSource ?? []).filter((row) => (
            filterColumns.every((column) => (
                !column.filteredValue?.length || !column.onFilter ||
                column.filteredValue.some((value) => column.onFilter(value, row))
            ))
        )).length;
        pagination.current = Math.min(pagination.current, Math.max(1, Math.ceil(count / (pagination.pageSize ?? 10))));
    }

    const currentPage = pagination ? pagination.current : undefined;
    useEffect(() => {
        if (dataAvailable && stateKey && tableChange.pagination?.current &&
            currentPage !== tableChange.pagination.current) {
            setTableChange({ ...tableChange, pagination: { ...tableChange.pagination, current: currentPage } });
        }
    }, [dataAvailable, stateKey, currentPage, tableChange, setTableChange]);

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
                                onClick={handleDownloadCSV}
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
                                    value={searchInput}
                                    onChange={(event) => setSearchInput(event.target.value)}
                                    onSearch={setSearchPhrase}
                                    enterButton
                                />
                            </CVATTooltip>
                        )}
                        <div>
                            { FilteringComponent !== null && (
                                <FilteringComponent
                                    stateKey={stateKey ? `${stateKey}:builder` : undefined}
                                    value={filterValue}
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
                                const groups = columnVisibility?.groups ?? {};
                                const groupHints = Object.entries(groups).map(([group, params]) => {
                                    if (params.maxVisible == null) {
                                        return null;
                                    }

                                    const visibleCount = modifiedColumns.filter((column) => {
                                        const columnGroup = (column as CVATColumn).visibilityGroup;
                                        return columnGroup === group && !(column.hidden ?? false);
                                    }).length;

                                    return (
                                        <Text key={group} type='secondary' className='cvat-table-columns-settings-hint'>
                                            {params.hint ?? `You can select up to ${params.maxVisible} columns`}
                                            {` (${visibleCount} of ${params.maxVisible})`}
                                        </Text>
                                    );
                                }).filter((item): item is JSX.Element => item !== null);

                                const items = modifiedColumns.map((column, idx: number) => {
                                    const title = typeof column.title === 'string' ? column.title : '';
                                    if (columnSearchPhrase &&
                                        !title.toLowerCase().includes(columnSearchPhrase.toLowerCase())) {
                                        return null;
                                    }

                                    const columnGroup = (column as CVATColumn).visibilityGroup;
                                    const maxVisible = columnGroup ? groups[columnGroup]?.maxVisible : undefined;
                                    const visibleCount = columnGroup ? modifiedColumns.filter((modifiedColumn) => {
                                        const modifiedColumnGroup = (modifiedColumn as CVATColumn).visibilityGroup;
                                        return modifiedColumnGroup === columnGroup && !(modifiedColumn.hidden ?? false);
                                    }).length : 0;
                                    const checked = !(column.hidden ?? false);
                                    const disabled = !checked && maxVisible != null && visibleCount >= maxVisible;

                                    return (
                                        <Checkbox
                                            key={idx}
                                            disabled={disabled}
                                            onChange={(e: CheckboxChangeEvent) => {
                                                const newIsHidden = !e.target.checked;
                                                if (stateKey && !columnVisibility?.controlled) {
                                                    setHiddenColumns({
                                                        ...hiddenColumns,
                                                        [columnKey(column, String(idx))]: newIsHidden,
                                                    });
                                                }
                                                if (!stateKey && !columnVisibility?.controlled) {
                                                    setLocalVisibility({
                                                        columns,
                                                        values: {
                                                            ...(localVisibility.columns === columns ?
                                                                localVisibility.values : {}),
                                                            [columnKey(column, String(idx))]: newIsHidden,
                                                        },
                                                    });
                                                }
                                                if (onChangeColumnVisibility) {
                                                    onChangeColumnVisibility(idx, newIsHidden);
                                                }
                                            }}
                                            checked={checked}
                                        >
                                            {title}
                                        </Checkbox>
                                    );
                                });

                                return (
                                    <div className='cvat-table-columns-settings-menu'>
                                        <Input
                                            size='small'
                                            placeholder='Search'
                                            prefix={<SearchOutlined />}
                                            onChange={(event) => setColumnSearchPhrase(event.target.value)}
                                            value={columnSearchPhrase}
                                        />
                                        {groupHints}
                                        {items}
                                    </div>
                                );
                            }}
                        >
                            <MoreOutlined />
                        </Popover>
                        { !!renderHeaderActions && renderHeaderActions() }
                    </Space>
                </Col>
            </Row>
            <Table
                {...rest}
                columns={modifiedColumns}
                dataSource={filteredDataSource}
                pagination={pagination}
                onChange={(nextPagination, filters, sorter, extra) => {
                    if (stateKey) {
                        setTableChange({
                            pagination: { current: nextPagination.current, pageSize: nextPagination.pageSize },
                            filters,
                            sorter: [sorter].flat().map((item) => ({ columnKey: item.columnKey, order: item.order })),
                        });
                    }
                    rest.onChange?.(nextPagination, filters, sorter, extra);
                }}
            />
        </div>
    );
}

export default React.memo(CVATTable);
