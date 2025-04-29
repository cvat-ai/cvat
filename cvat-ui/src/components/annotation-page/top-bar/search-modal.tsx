// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { Modal, Input, List } from 'antd';
import { useSelector } from 'react-redux';
import { getCore } from 'cvat-core-wrapper';

const { Search } = Input;

interface Props {
}

const cvat = getCore();

function SearchModal(props: Props): JSX.Element {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<string[]>([]);
    const visible = useSelector((state: any) => state.annotation.search.visible);
    const jobInstance = useSelector((state: any) => state.annotation.job.instance);

    const [jobMeta, setJobMeta] = useState<any>(null);
    useEffect(() => {
        const fetchMeta = async () => {
            if (jobInstance) {
                const meta = await cvat.frames.getMeta('job', jobInstance.id);
                setJobMeta(meta);
            }
        };
        fetchMeta();
    }, [jobInstance]);

    const handleSearch = (value: string) => {
        console.log('Searching for:', value);
        console.log('Job meta:', jobMeta);
        if (jobMeta && jobMeta.frames) {
            const filteredFrames = jobMeta.frames
                .filter((frame: any) => frame.name.toLowerCase().includes(value.toLowerCase()))
                .slice(0, 10);
            setResults(filteredFrames.map((frame: any) => frame.name));
        }
    };

    const onSelect = (item: string) => {
        // Handle item selection
        console.log('Selected item:', item);
        setSearchTerm('');
        setResults([]);
    };

    return (
        <Modal
            title="Search"
            open={visible}
            footer={null}
            width={600}
        >
            <Search
                placeholder="Search..."
                onSearch={handleSearch}
                onChange={(e) => handleSearch(e.target.value)}
                value={searchTerm}
                enterButton
            />
            <List
                bordered
                dataSource={results}
                renderItem={(item) => (
                    <List.Item onClick={() => onSelect(item)} style={{ cursor: 'pointer' }}>
                        {item}
                    </List.Item>
                )}
                style={{ marginTop: 16 }}
            />
        </Modal>
    );
};

export default SearchModal;