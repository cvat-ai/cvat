// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { OrderedListOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox/Checkbox';
import Dropdown from 'antd/lib/dropdown';
import { omit } from 'lodash';
import CVATTooltip from 'components/common/cvat-tooltip';
import Space from 'antd/lib/space';

interface Props {
    sortingFields: string[];
    onUpdateSorting(sorting: string | null): void;
}

function SortingModalComponent(props: Props): JSX.Element {
    const { sortingFields, onUpdateSorting } = props;
    const [mounted, setMounted] = useState<boolean>(false);
    const [appliedSorting, setAppliedSorting] = useState<Record<string, string>>({});
    const [visible, setVisible] = useState<boolean>(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted) {
            onUpdateSorting(Object.values(appliedSorting).join(',').toLowerCase() || null);
        }
    }, [appliedSorting]);

    return (
        <Dropdown
            destroyPopupOnHide
            visible={visible}
            placement='bottomCenter'
            overlay={(
                <div className='cvat-jobs-page-sorting-list'>
                    {sortingFields.map((sortingField: string): JSX.Element => {
                        const caretBlock = appliedSorting[sortingField]?.startsWith('-') ? (
                            <SortDescendingOutlined />
                        ) : (
                            <SortAscendingOutlined />
                        );

                        return (
                            <Checkbox
                                key={sortingField}
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
                                <CVATTooltip overlay={appliedSorting[sortingField]?.startsWith('-') ? 'Descending sort' : 'Ascending sort'}>
                                    <Button
                                        size='small'
                                        disabled={!(sortingField in appliedSorting)}
                                        type='text'
                                        onClick={(event: React.MouseEvent) => {
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
                                        }}
                                    >
                                        {sortingField in appliedSorting ? (
                                            caretBlock
                                        ) : null }
                                    </Button>
                                </CVATTooltip>
                            </Checkbox>
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
