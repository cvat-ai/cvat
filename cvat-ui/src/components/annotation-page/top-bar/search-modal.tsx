// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';
import Text from 'antd/lib/typography/Text';
import AutoComplete from 'antd/lib/auto-complete';
import _ from 'lodash';
import type { BaseSelectRef } from 'rc-select';

import { CombinedState } from 'reducers';
import { changeFrameAsync, switchShowSearchFramesModal } from 'actions/annotation-actions';
import CvatTooltip from 'components/common/cvat-tooltip';

interface SearchResult {
    number: number;
    name: string;
}

const SEARCH_LIMIT = 25;
const SEARCH_DEBOUNCE_TIME = 100;

function SearchFramesModal(): JSX.Element {
    const dispatch = useDispatch();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const {
        visible,
        meta,
        frameNumbers,
    } = useSelector((state: CombinedState) => ({
        visible: state.annotation.search.visible,
        meta: state.annotation.job.meta,
        frameNumbers: state.annotation.job.frameNumbers,
    }), shallowEqual);

    const [searchData, setSearchData] = useState<SearchResult[]>([]);
    useEffect(() => {
        if (meta) {
            const newSearchData = meta.frames.map((frame: any, idx: number) => ({
                name: frame.name,
                number: frameNumbers[idx],
            }));
            setSearchData(newSearchData);
        }
    }, [meta]);

    const onCancel = useCallback(() => {
        dispatch(switchShowSearchFramesModal(false));
        setSearchTerm('');
        setSearchResults([]);
    }, []);

    const handleSearch = _.debounce((value: string) => {
        let count = 0;
        const searchResult = [];
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

    const onSelect = useCallback((frameNumber: string) => {
        onCancel();
        dispatch(changeFrameAsync(+frameNumber));
    }, []);

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
                onSelect={onSelect}
                allowClear
                className='cvat-frame-search-selector'
            />
        </Modal>
    );
}

export default React.memo(SearchFramesModal);
