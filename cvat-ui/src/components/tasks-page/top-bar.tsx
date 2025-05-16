// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';

import { Row, Col } from 'antd/lib/grid';
import Popover from 'antd/lib/popover';
import { LoadingOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import DatePicker from 'antd/lib/date-picker';
import type { RangePickerProps } from 'antd/lib/date-picker';
import { importActions } from 'actions/import-actions';
import { SortingComponent, ResourceFilterHOC, defaultVisibility } from 'components/resource-sorting-filtering';
import { TasksQuery } from 'reducers';
import { usePrevious } from 'utils/hooks';
import { MultiPlusIcon } from 'icons';
import dimensions from 'utils/dimensions';
import type { Dayjs } from 'dayjs';
import CvatDropdownMenuPaper from 'components/common/cvat-dropdown-menu-paper';
import {
    localStorageRecentKeyword,
    localStorageRecentCapacity,
    predefinedFilterValues,
    config,
} from './tasks-filter-configuration';

const { RangePicker } = DatePicker;

const FilteringComponent = ResourceFilterHOC(
    config,
    localStorageRecentKeyword,
    localStorageRecentCapacity,
    predefinedFilterValues,
);

interface VisibleTopBarProps {
    onApplyFilter(filter: string | null): void;
    onApplySorting(sorting: string | null): void;
    onApplySearch(search: string | null): void;
    query: TasksQuery;
    importing: boolean;
}

export default function TopBarComponent(props: VisibleTopBarProps): JSX.Element {
    const dispatch = useDispatch();
    const { importing, query, onApplyFilter, onApplySorting, onApplySearch } = props;
    const [visibility, setVisibility] = useState(defaultVisibility);
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
    const history = useHistory();
    const prevImporting = usePrevious(importing);

    useEffect(() => {
        if (prevImporting && !importing) {
            onApplyFilter(query.filter);
        }
    }, [importing]);

    const handleDateRangeChange: RangePickerProps['onChange'] = (dates) => {
        setDateRange(dates);
        if (dates && dates[0] && dates[1]) {
            const startDate = dates[0].format('YYYY-MM-DD');
            const endDate = dates[1].format('YYYY-MM-DD');

            // Create a filter for the date range
            const dateFilter = JSON.stringify({
                and: [{ '=': [{ var: 'created_from' }, startDate] }, { '=': [{ var: 'created_to' }, endDate] }],
            });

            onApplyFilter(dateFilter);
        } else if (dates === null) {
            // Clear the date filter
            onApplyFilter(query.filter && query.filter !== '{}' ? query.filter : null);
        }
    };

    return (
        <Row className='cvat-tasks-page-top-bar' justify='center' align='middle'>
            <Col {...dimensions}>
                <div className='cvat-tasks-page-filters-wrapper'>
                    <Input.Search
                        enterButton
                        onSearch={(phrase: string) => {
                            onApplySearch(phrase);
                        }}
                        defaultValue={query.search || ''}
                        className='cvat-tasks-page-search-bar'
                        placeholder='Search ...'
                    />
                    <div>
                        <SortingComponent
                            visible={visibility.sorting}
                            onVisibleChange={(visible: boolean) =>
                                setVisibility({ ...defaultVisibility, sorting: visible })
                            }
                            defaultFields={query.sort?.split(',') || ['-ID']}
                            sortingFields={[
                                'ID',
                                'Owner',
                                'Status',
                                'Assignee',
                                'Updated date',
                                'Subset',
                                'Mode',
                                'Dimension',
                                'Project ID',
                                'Name',
                                'Project name',
                            ]}
                            onApplySorting={onApplySorting}
                        />
                    </div>
                    <div>
                        <FilteringComponent
                            value={query.filter}
                            predefinedVisible={visibility.predefined}
                            builderVisible={visibility.builder}
                            recentVisible={visibility.recent}
                            onPredefinedVisibleChange={(visible: boolean) =>
                                setVisibility({ ...defaultVisibility, predefined: visible })
                            }
                            onBuilderVisibleChange={(visible: boolean) =>
                                setVisibility({ ...defaultVisibility, builder: visible })
                            }
                            onRecentVisibleChange={(visible: boolean) =>
                                setVisibility({ ...defaultVisibility, builder: visibility.builder, recent: visible })
                            }
                            onApplyFilter={onApplyFilter}
                        />
                    </div>
                    <div>
                        <Popover
                            content={
                                <div className='cvat-tasks-date-range-picker'>
                                    <RangePicker onChange={handleDateRangeChange} value={dateRange} />
                                </div>
                            }
                            title='Select date range'
                            trigger='click'
                        >
                            <Button type='default' className='cvat-tasks-date-range-button'>
                                Filter by date
                            </Button>
                        </Popover>
                    </div>
                </div>
                <div>
                    <Popover
                        trigger={['click']}
                        destroyTooltipOnHide
                        overlayInnerStyle={{ padding: 0 }}
                        content={
                            <CvatDropdownMenuPaper>
                                <Button
                                    className='cvat-create-task-button'
                                    type='primary'
                                    onClick={(): void => history.push('/tasks/create')}
                                    icon={<PlusOutlined />}
                                >
                                    Create a new task
                                </Button>
                                <Button
                                    className='cvat-create-multi-tasks-button'
                                    type='primary'
                                    onClick={(): void => history.push('/tasks/create?many=true')}
                                    icon={
                                        <span className='anticon'>
                                            <MultiPlusIcon />
                                        </span>
                                    }
                                >
                                    Create multi tasks
                                </Button>
                                <Button
                                    className='cvat-import-task-button'
                                    type='primary'
                                    disabled={importing}
                                    icon={importing ? <LoadingOutlined /> : <UploadOutlined />}
                                    onClick={() => dispatch(importActions.openImportBackupModal('task'))}
                                >
                                    Create from backup
                                </Button>
                            </CvatDropdownMenuPaper>
                        }
                    >
                        <Button type='primary' className='cvat-create-task-dropdown' icon={<PlusOutlined />} />
                    </Popover>
                </div>
            </Col>
        </Row>
    );
}
