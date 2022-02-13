// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import {
    ArrowUpOutlined, OrderedListOutlined, SortAscendingOutlined, SortDescendingOutlined,
} from '@ant-design/icons';
import Button from 'antd/lib/button';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox/Checkbox';
import Dropdown from 'antd/lib/dropdown';
import { omit } from 'lodash';
import CVATTooltip from 'components/common/cvat-tooltip';
import Space from 'antd/lib/space';

interface Props {
    sortingFields: string[];
    visible: boolean;
    onVisibleChange(visible: boolean): void;
    onApplySorting(sorting: string | null): void;
}

function SortingModalComponent(props: Props): JSX.Element {
    const {
        sortingFields: sortingFieldsProp, visible, onApplySorting, onVisibleChange,
    } = props;
    const [sortingFields, setSortingFields] = useState<string[]>(sortingFieldsProp);
    const [mounted, setMounted] = useState<boolean>(false);
    const [appliedSorting, setAppliedSorting] = useState<Record<string, string>>({});

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted) {
            const sortingString = sortingFields
                .filter((sortingField: string) => sortingField in appliedSorting)
                .map((sortingField: string) => appliedSorting[sortingField])
                .join(',').toLowerCase().replace(/\s/g, '_') || null;
            onApplySorting(sortingString);
        }
    }, [appliedSorting, sortingFields]);

    return (
        <Dropdown
            destroyPopupOnHide
            visible={visible}
            placement='bottomCenter'
            overlay={(
                <div className='cvat-jobs-page-sorting-list'>
                    {sortingFields.map((sortingField: string, index: number): JSX.Element => {
                        const isActiveField = sortingField in appliedSorting;
                        const isAscendingField = isActiveField && !appliedSorting[sortingField]?.startsWith('-');
                        const isDescendingField = isActiveField && !isAscendingField;
                        const onClick = (): void => {
                            if (isDescendingField) {
                                setAppliedSorting({ ...appliedSorting, [sortingField]: sortingField });
                            } else if (isAscendingField) {
                                setAppliedSorting({ ...appliedSorting, [sortingField]: `-${sortingField}` });
                            }
                        };

                        const ascentDescentBlockProps = { disabled: !isActiveField, onClick };
                        const ascentDescentBlock = (
                            <CVATTooltip overlay={appliedSorting[sortingField]?.startsWith('-') ? 'Descending sort' : 'Ascending sort'}>
                                {
                                    isDescendingField ? (
                                        <SortDescendingOutlined {...ascentDescentBlockProps} />
                                    ) : (
                                        <SortAscendingOutlined {...ascentDescentBlockProps} />
                                    )
                                }
                            </CVATTooltip>
                        );

                        return (
                            <div key={sortingField}>
                                <Checkbox
                                    checked={sortingField in appliedSorting}
                                    onChange={(event: CheckboxChangeEvent) => {
                                        const copy = [...sortingFields];
                                        const latestEnabledSortingIdx = Math.max(-1,
                                            ...Object.keys(appliedSorting)
                                                .map((sorting: string) => sortingFields.indexOf(sorting)));
                                        if (event.target.checked) {
                                            setAppliedSorting({ ...appliedSorting, [sortingField]: sortingField });
                                            copy.splice(latestEnabledSortingIdx + 1, 0, ...copy.splice(index, 1));
                                        } else {
                                            setAppliedSorting(omit(appliedSorting, sortingField));
                                            copy.splice(latestEnabledSortingIdx, 0, ...copy.splice(index, 1));
                                        }

                                        setSortingFields(copy);
                                    }}
                                >
                                    {sortingField}
                                </Checkbox>
                                <div>
                                    {index > 0 ? (
                                        <CVATTooltip overlay='Increase priority'>
                                            <ArrowUpOutlined
                                                disabled={!isActiveField}
                                                onClick={() => {
                                                    const copy = [...sortingFields];
                                                    copy.splice(index - 1, 0, ...copy.splice(index, 1));
                                                    setSortingFields(copy);
                                                }}
                                            />
                                        </CVATTooltip>
                                    ) : null}
                                    {ascentDescentBlock}
                                </div>
                            </div>
                        );
                    })}
                    <Space className='cvat-jobs-page-sorting-space'>
                        <Button size='small' onClick={() => onVisibleChange(false)}>Close</Button>
                    </Space>
                </div>
            )}
        >
            <Button type='default' onClick={() => onVisibleChange(true)}>
                Sort by
                <OrderedListOutlined />
            </Button>
        </Dropdown>
    );
}

export default React.memo(SortingModalComponent);
