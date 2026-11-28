// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import Modal from 'antd/lib/modal';
import Text from 'antd/lib/typography/Text';
import AutoComplete from 'antd/lib/auto-complete';
import _ from 'lodash';
import type { BaseSelectRef } from 'rc-select';

import CvatTooltip from 'components/common/cvat-tooltip';

export interface FrameSearchItem {
    number: number;
    name: string;
}

interface Props {
    visible: boolean;
    searchData: FrameSearchItem[];
    onSelect: (frameNumber: number) => void;
    onCancel: () => void;
}

const SEARCH_LIMIT = 25;
const SEARCH_DEBOUNCE_TIME = 100;

// Presentational filename search modal shared by the annotation player and the task page.
// It only knows about a flat list of { number, name } items and reports the selected
// frame number back to the parent, which decides what to do with it.
function FrameSearchModal(props: Readonly<Props>): JSX.Element {
    const {
        visible, searchData, onSelect, onCancel,
    } = props;
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<FrameSearchItem[]>([]);

    useEffect(() => {
        if (!visible) {
            setSearchTerm('');
            setSearchResults([]);
        }
    }, [visible]);

    const handleSearch = _.debounce((value: string) => {
        let count = 0;
        const searchResult: FrameSearchItem[] = [];
        for (const element of searchData) {
            if (count >= SEARCH_LIMIT) break;
            if (element.name.toLowerCase().includes(value.toLowerCase())) {
                count++;
                searchResult.push(element);
            }
        }
        setSearchResults(searchResult);
    }, SEARCH_DEBOUNCE_TIME);

    const onSearch = useCallback((value: string) => {
        setSearchTerm(value);
        handleSearch(value);
    }, [searchData]);

    const autoCompleteRef = useCallback((node: BaseSelectRef | null) => {
        if (node !== null && visible) {
            node.focus();
        }
    }, [visible]);

    return (
        <Modal
            className='cvat-frame-search-modal'
            open={visible}
            footer={null}
            onCancel={onCancel}
            width={600}
            destroyOnClose
            closeIcon={null}
            styles={{
                mask: {
                    backgroundColor: 'unset',
                },
            }}
        >
            <AutoComplete
                ref={autoCompleteRef}
                defaultValue={searchTerm}
                placeholder='Type to search'
                showSearch
                onSearch={onSearch}
                notFoundContent={searchTerm ? <Text>No frames found</Text> : null}
                options={searchResults.map((item) => ({
                    value: item.number,
                    label: (
                        <CvatTooltip title={item.name} className='cvat-frame-search-item'>
                            <Text strong className='cvat-frame-search-item-number'>{`#${item.number} `}</Text>
                            <Text className='cvat-frame-search-item-name'>{item.name}</Text>
                        </CvatTooltip>
                    ),
                }))}
                onSelect={(frameNumber: string) => onSelect(+frameNumber)}
                allowClear
                className='cvat-frame-search-selector'
            />
        </Modal>
    );
}

export default React.memo(FrameSearchModal);
