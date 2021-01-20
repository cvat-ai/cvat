// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */

import { FilterOutlined, PlusOutlined, QuestionOutlined } from '@ant-design/icons';
import {
    changeAnnotationsFilters as changeAnnotationsFiltersAction,
    fetchAnnotationsAsync,
} from 'actions/annotation-actions';
import { Popconfirm, Tag } from 'antd';
import React, {
    ReactElement, useEffect, useRef, useState,
} from 'react';
import { connect } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import AnnotationFilterItem from '../annotation-filter-item/annotation-filter-item';
import AnnotationFilterPanel from '../annotation-filter-panel/annotation-filter-panel';
import './annotation-filter-pane.scss';

interface DispatchToProps {
    changeAnnotationsFilters(value: any): void;
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        changeAnnotationsFilters(value: any) {
            dispatch(changeAnnotationsFiltersAction(value));
            dispatch(fetchAnnotationsAsync());
        },
    };
}

const AnnotationFilterPane = (props: DispatchToProps): ReactElement => {
    const { changeAnnotationsFilters } = props;

    const [editItem, setEditItem] = useState();
    const [filters, setFilters] = useState([] as any);
    const [filterPanelVisible, setFilterPanelVisible] = useState(false);

    const filtersPaneRef = useRef<null | HTMLDivElement>(null);
    const filtersEndRef = useRef<null | HTMLDivElement>(null);
    const clearFiltersRef = useRef<null | HTMLAnchorElement>(null);

    const scrollFiltersToBottom = (): void => {
        setTimeout(() => filtersEndRef?.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100);
    };

    const resetFilters = (e: React.MouseEvent<HTMLElement, MouseEvent>): void => {
        e.preventDefault();
        setFilters([]);
    };

    const confirmClearFilters = (e: React.MouseEvent<HTMLElement, MouseEvent>): void => {
        e.preventDefault();
        clearFiltersRef?.current?.click();
    };

    useEffect(() => {
        const filtersStringified = filtersPaneRef.current?.innerText.replace(/(?:\r\n|\r|\n)/g, '');
        changeAnnotationsFilters(filters.length ? [filtersStringified] : []);
        scrollFiltersToBottom();
    }, [filters]);

    useEffect(() => {
        if (!filterPanelVisible) setEditItem(undefined);
    }, [filterPanelVisible]);

    const addFilter = (filter: any): void => {
        const newFilter = { ...filter };
        newFilter.id = uuidv4();
        newFilter.left = [];
        newFilter.right = [];
        setFilters([...filters, newFilter]);
    };

    const editFilter = (filter: any): void => {
        let filterToEditIndex = -1;
        filters.find((filterItem: any, filterItemIndex: number): boolean => {
            filterToEditIndex = filterItemIndex;
            return filterItem.id === filter.id;
        });
        if (filterToEditIndex >= 0) {
            filters[filterToEditIndex] = { ...filter, id: uuidv4() };
            setFilters(filters);
        }
        setFilterPanelVisible(false);
    };

    return (
        <>
            <div
                ref={filtersPaneRef}
                className='annotation-filters-pane'
                onClick={() => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                    !filters.length && setFilterPanelVisible(true);
                }}
                style={{ cursor: filters.length ? 'default' : 'pointer' }}
                onContextMenu={(e: React.MouseEvent<HTMLElement, MouseEvent>) => confirmClearFilters(e)}
            >
                {filters?.length ? (
                    <>
                        {filters.map((item: any) => (
                            <AnnotationFilterItem
                                key={item.id}
                                item={item}
                                onEdit={(filterToEdit: any) => {
                                    setEditItem(filterToEdit);
                                    setFilterPanelVisible(true);
                                }}
                                onDelete={(filterToDelete: any) => {
                                    const newFilters = filters.filter(
                                        (filterItem: any) => filterItem.id !== filterToDelete.id,
                                    );
                                    if (newFilters.length) {
                                        newFilters[0].id = uuidv4();
                                        newFilters[0].concatenator = null;
                                    }
                                    setFilters(newFilters);
                                }}
                            />
                        ))}
                        <div className='pop-confirm-wrapper' onClick={(e) => e.stopPropagation()}>
                            <Popconfirm
                                placement='bottom'
                                title='Are you sure you want to clear all filters?'
                                icon={<QuestionOutlined style={{ color: 'red' }} />}
                                onConfirm={(e: any) => resetFilters(e)}
                                okText='Yes'
                                cancelText='No'
                            >
                                <span ref={clearFiltersRef} />
                            </Popconfirm>
                        </div>
                        <Tag className='add-more' onClick={() => setFilterPanelVisible(true)}>
                            <PlusOutlined />
                        </Tag>
                        <div ref={filtersEndRef} />
                    </>
                ) : (
                    <div className='no-filters'>
                        <FilterOutlined className='no-filters-icon' />
                        <span>Annotations filters</span>
                    </div>
                )}
            </div>
            <AnnotationFilterPanel
                editItem={editItem}
                isFirst={!filters.length || (editItem && !editItem.concatenator?.length)}
                isVisible={filterPanelVisible}
                onClose={() => setFilterPanelVisible(false)}
                onAdd={(filter: any) => addFilter(filter)}
                onEdit={(filter: any) => editFilter(filter)}
            />
        </>
    );
};

export default connect(null, mapDispatchToProps)(AnnotationFilterPane);
