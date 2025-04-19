// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import {
    OrderedListOutlined, SortAscendingOutlined, SortDescendingOutlined,
} from '@ant-design/icons';
import Button from 'antd/lib/button';
import Popover from 'antd/lib/popover';
import Radio from 'antd/lib/radio';
import { useTranslation } from 'react-i18next';

import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    sortingFields: string[];
    sortingLabelMap?: Record<string, string>;
    defaultFields: string[];
    visible: boolean;
    disabled?: boolean;
    onVisibleChange(visible: boolean): void;
    onApplySorting(sorting: string | null): void;
}

const ANCHOR_KEYWORD = '__anchor__';

const SortableItem = SortableElement(
    ({
        value, label, appliedSorting, setAppliedSorting, valueIndex, anchorIndex,
    }: {
        value: string;
        label: string;
        valueIndex: number;
        anchorIndex: number;
        appliedSorting: Record<string, string>;
        setAppliedSorting: (arg: Record<string, string>) => void;
    }): JSX.Element => {
        const isActiveField = value in appliedSorting;
        const isAscendingField = isActiveField && !appliedSorting[value]?.startsWith('-');
        const isDescendingField = isActiveField && !isAscendingField;
        const { t: tSort } = useTranslation(undefined, { keyPrefix: 'sort' });

        const onClick = (): void => {
            if (isDescendingField) {
                setAppliedSorting({ ...appliedSorting, [value]: value });
            } else if (isAscendingField) {
                setAppliedSorting({ ...appliedSorting, [value]: `-${value}` });
            }
        };

        if (value === ANCHOR_KEYWORD) {
            return (
                <hr className='cvat-sorting-anchor' />
            );
        }

        return (
            <div className='cvat-sorting-field'>
                <Radio.Button disabled={valueIndex > anchorIndex}>
                    <span className='cvat-sorting-field-label'>{label || ''}</span>
                    <span className='cvat-sorting-field-prop'>{value}</span>
                </Radio.Button>
                <div>
                    <CVATTooltip overlay={
                        appliedSorting[value]?.startsWith('-') ?
                            tSort('Descending sort') :
                            tSort('Ascending sort')
                    }
                    >
                        <Button className='cvat-switch-sort-order-button' type='text' disabled={!isActiveField} onClick={onClick}>
                            {
                                isDescendingField ? (
                                    <SortDescendingOutlined />
                                ) : (
                                    <SortAscendingOutlined />
                                )
                            }
                        </Button>
                    </CVATTooltip>
                </div>
            </div>
        );
    },
);

const SortableList = SortableContainer(
    ({
        items, appliedSorting, setAppliedSorting, labelMap,
    } :
    {
        items: string[];
        labelMap: Record<string, string>;
        appliedSorting: Record<string, string>;
        setAppliedSorting: (arg: Record<string, string>) => void;
    }) => (
        <div className='cvat-resource-page-sorting-list'>
            { items.map((value: string, index: number) => (
                <SortableItem
                    key={`item-${value}`}
                    appliedSorting={appliedSorting}
                    setAppliedSorting={setAppliedSorting}
                    index={index}
                    value={value}
                    label={labelMap[value]}
                    valueIndex={index}
                    anchorIndex={items.indexOf(ANCHOR_KEYWORD)}
                />
            )) }
        </div>
    ),
);

function SortingModalComponent(props: Props): JSX.Element {
    const {
        sortingFields: sortingFieldsProp,
        defaultFields, visible, onApplySorting, onVisibleChange, disabled,
        sortingLabelMap = {},
    } = props;
    const [appliedSorting, setAppliedSorting] = useState<Record<string, string>>(
        defaultFields.reduce((acc: Record<string, string>, field: string) => {
            const [isAscending, absField] = field.startsWith('-') ?
                [false, field.slice(1).replace('_', ' ')] : [true, field.replace('_', ' ')];
            const originalField = sortingFieldsProp.find((el: string) => el.toLowerCase() === absField.toLowerCase());
            if (originalField) {
                return { ...acc, [originalField]: isAscending ? originalField : `-${originalField}` };
            }

            return acc;
        }, {}),
    );
    const [isMounted, setIsMounted] = useState<boolean>(false);
    const [sortingFields, setSortingFields] = useState<string[]>(
        Array.from(new Set([...Object.keys(appliedSorting), ANCHOR_KEYWORD, ...sortingFieldsProp])),
    );
    const [appliedOrder, setAppliedOrder] = useState<string[]>([...defaultFields]);
    const { t: tSort } = useTranslation(undefined, { keyPrefix: 'sort' });

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        const listener = (event: MouseEvent): void => {
            const path: HTMLElement[] = event.composedPath()
                .filter((el: EventTarget) => el instanceof HTMLElement) as HTMLElement[];
            if (path.some((el: HTMLElement) => el.id === 'root') && !path.some((el: HTMLElement) => el.classList.contains('ant-btn'))) {
                if (visible) {
                    onVisibleChange(false);
                }
            }
        };

        window.addEventListener('click', listener);
        return () => window.removeEventListener('click', listener);
    }, [visible]);

    useEffect(() => {
        if (!isMounted) return;
        const anchorIdx = sortingFields.indexOf(ANCHOR_KEYWORD);
        const appliedSortingCopy = { ...appliedSorting };
        const slicedSortingFields = sortingFields.slice(0, anchorIdx);
        const updated = slicedSortingFields.length !== appliedOrder.length || slicedSortingFields
            .some((field: string, index: number) => field !== appliedOrder[index]);

        sortingFields.forEach((field: string, index: number) => {
            if (index < anchorIdx && !(field in appliedSortingCopy)) {
                appliedSortingCopy[field] = field;
            } else if (index >= anchorIdx && field in appliedSortingCopy) {
                delete appliedSortingCopy[field];
            }
        });

        if (updated) {
            setAppliedOrder(slicedSortingFields);
            setAppliedSorting(appliedSortingCopy);
        }
    }, [sortingFields]);

    useEffect(() => {
        // this hook uses sortingFields to understand order
        // but we do not specify this field in dependencies
        // because we do not want the hook to be called after changing sortingField
        // sortingField value is always relevant because if order changes, the hook before will be called first

        if (!isMounted) return;
        const anchorIdx = sortingFields.indexOf(ANCHOR_KEYWORD);
        const sortingString = sortingFields.slice(0, anchorIdx)
            .map((field: string): string => appliedSorting[field])
            .join(',').toLowerCase().replace(/\s/g, '_');
        onApplySorting(sortingString || null);
    }, [appliedSorting]);

    return (
        <Popover
            destroyTooltipOnHide
            open={visible}
            placement='bottomLeft'
            overlayInnerStyle={{ padding: 0 }}
            content={(
                <SortableList
                    onSortEnd={({ oldIndex, newIndex }: { oldIndex: number, newIndex: number }) => {
                        if (oldIndex !== newIndex) {
                            const sortingFieldsCopy = [...sortingFields];
                            sortingFieldsCopy.splice(newIndex, 0, ...sortingFieldsCopy.splice(oldIndex, 1));
                            setSortingFields(sortingFieldsCopy);
                        }
                    }}
                    helperClass='cvat-sorting-dragged-item'
                    items={sortingFields}
                    labelMap={sortingLabelMap}
                    appliedSorting={appliedSorting}
                    setAppliedSorting={setAppliedSorting}
                />
            )}
        >
            <Button
                disabled={disabled}
                className='cvat-switch-sort-constructor-button'
                type='default'
                onClick={() => onVisibleChange(!visible)}
            >
                {tSort('Sort by')}
                <OrderedListOutlined />
            </Button>
        </Popover>
    );
}

export default React.memo(SortingModalComponent);
