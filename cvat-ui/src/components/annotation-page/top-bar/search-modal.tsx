// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';
import Input from 'antd/lib/input';
import List from 'antd/lib/list';
import Text from 'antd/lib/typography/Text';
import _ from 'lodash';
import { getCore } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import { changeFrameAsync, switchShowPallet } from 'actions/annotation-actions';
import CvatTooltip from 'components/common/cvat-tooltip';

const { Search } = Input;

interface SearchResult {
    number: number;
    name: string;
}

const cvat = getCore();

const SEARCH_LIMIT = 25;
const SEARCH_DEBOUNCE_TIME = 500;

function SearchModal(): JSX.Element {
    const dispatch = useDispatch();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const visible = useSelector((state: CombinedState) => state.annotation.search.visible);
    const jobInstance = useSelector((state: CombinedState) => state.annotation.job.instance);
    const frameNumbers = useSelector((state: CombinedState) => state.annotation.job.frameNumbers);

    const [searchData, setSearchData] = useState<SearchResult[]>([]);
    const getFramesData = async () => {
        if (jobInstance) {
            const meta = await cvat.frames.getMeta('job', jobInstance.id);
            const newSearchData = meta.frames.map((frame: any, idx: number) => ({
                name: frame.name,
                number: frameNumbers[idx],
            }));
            setSearchData(newSearchData);
        }
    };
    useEffect(() => {
        getFramesData();
    }, [jobInstance]);

    const onCancel = useCallback(() => {
        dispatch(switchShowPallet(false));
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

    const onSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchTerm(value);
        handleSearch(value);
    }, [searchData]);

    const onSelect = useCallback((item: SearchResult) => {
        onCancel();
        dispatch(changeFrameAsync(item.number));
    }, []);

    return (
        <Modal
            className='cvat-frame-search-modal'
            title="Search frames by name"
            open={visible}
            footer={null}
            onCancel={onCancel}
            width={600}
            destroyOnClose
        >
            <Search
                placeholder="Search..."
                onChange={onSearch}
                value={searchTerm}
                enterButton
            />
            {searchResults.length !== 0 && (
                <List
                    dataSource={searchResults}
                    renderItem={(item) => (
                        <List.Item onClick={() => onSelect(item)} className='cvat-frame-search-item'>
                            <CvatTooltip title={item.name}>
                                <Text strong className='cvat-frame-search-item-number'>{`#${item.number} `}</Text>
                                <Text className='cvat-frame-search-item-name'>{item.name}</Text>
                            </CvatTooltip>
                        </List.Item>
                    )}
                    style={{ marginTop: 16 }}
                />
            )}
        </Modal>
    );
};

export default React.memo(SearchModal);