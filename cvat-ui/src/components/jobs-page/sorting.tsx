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
    onApplySorting(sorting: string | null): void;
}

function SortingModalComponent(props: Props): JSX.Element {
    const { sortingFields: sortingFieldsProp, onApplySorting } = props;
    const [sortingFields, setSortingFields] = useState<string[]>(sortingFieldsProp);
    const [mounted, setMounted] = useState<boolean>(false);
    const [appliedSorting, setAppliedSorting] = useState<Record<string, string>>({});
    const [visible, setVisible] = useState<boolean>(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted) {
            const sortingString = sortingFields
                .filter((sortingField: string) => sortingField in appliedSorting)
                .map((sortingField: string) => appliedSorting[sortingField])
                .join(',').toLowerCase() || null;
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
                        const onClick = (event: React.MouseEvent): void => {
                            event.stopPropagation();
                            if (appliedSorting[sortingField].startsWith('-')) {
                                setAppliedSorting({
                                    ...appliedSorting, [sortingField]: sortingField,
                                });
                            } else {
                                setAppliedSorting({
                                    ...appliedSorting, [sortingField]: `-${sortingField}`,
                                });
                            }
                        };

                        const caretBlock = appliedSorting[sortingField]?.startsWith('-') ? (
                            <SortDescendingOutlined onClick={onClick} />
                        ) : (
                            <SortAscendingOutlined onClick={onClick} />
                        );

                        return (
                            <div key={sortingField}>
                                <Checkbox
                                    checked={sortingField in appliedSorting}
                                    onChange={(event: CheckboxChangeEvent) => {
                                        if (event.target.checked) {
                                            setAppliedSorting({ ...appliedSorting, [sortingField]: sortingField });
                                        } else {
                                            setAppliedSorting(omit(appliedSorting, sortingField));
                                        }
                                    }}
                                >
                                    {sortingField}
                                </Checkbox>
                                {index > 0 ? (
                                    <CVATTooltip overlay='Increase priority'>
                                        <ArrowUpOutlined onClick={(event: React.MouseEvent) => {
                                            event.stopPropagation();
                                            const copy = [...sortingFields];
                                            copy.splice(index - 1, 0, ...copy.splice(index, 1));
                                            setSortingFields(copy);
                                        }}
                                        />
                                    </CVATTooltip>
                                ) : null}
                                {sortingField in appliedSorting ? (
                                    <CVATTooltip overlay={appliedSorting[sortingField]?.startsWith('-') ? 'Descending sort' : 'Ascending sort'}>
                                        { caretBlock }
                                    </CVATTooltip>
                                ) : null }
                            </div>
                        );
                    })}
                    <Space align='end'>
                        <Button size='small' onClick={() => setVisible(false)}>Close</Button>
                    </Space>
                </div>
            )}
        >
            <Button type='default' onClick={() => setVisible(true)}>
                Sort by
                <OrderedListOutlined />
            </Button>
        </Dropdown>
    );
}

export default React.memo(SortingModalComponent);
