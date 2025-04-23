// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { Input, List } from 'antd';
import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers';

interface SearchModalProps {
    frameFilenames: string[];
    onSelect: (filename: string) => void;
}

export function SearchModal({ frameFilenames, onSelect }: SearchModalProps): JSX.Element | null {
    const isVisible = useSelector((state: CombinedState) => state.annotation.search.visible);

    const [searchTerm, setSearchTerm] = useState('');
    const [filteredFilenames, setFilteredFilenames] = useState<string[]>(frameFilenames);

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        const filtered = frameFilenames.filter((filename) => filename.toLowerCase().includes(value.toLowerCase()),
        );
        setFilteredFilenames(filtered);
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div style={{
            position: 'absolute', top: '10%', left: '0', width: '40%', zIndex: 1000,
        }}
        >
            <Input.Search
                placeholder='Search frame filenames'
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ marginBottom: '16px' }}
            />
            <List
                bordered
                dataSource={filteredFilenames}
                renderItem={(item) => (
                    <List.Item onClick={() => onSelect(item)} style={{ cursor: 'pointer' }}>
                        {item}
                    </List.Item>
                )}
            />
        </div>
    );
}

export default React.memo(SearchModal);
