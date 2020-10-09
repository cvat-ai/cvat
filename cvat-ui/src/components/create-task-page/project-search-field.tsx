// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import Autocomplete from 'antd/lib/auto-complete';

import getCore from 'cvat-core-wrapper';

const core = getCore();

type Props = {
    value: number | null;
    onSelect: (id: number | null) => void;
};

type Project = {
    id: number;
    name: string;
};

export default function ProjectSearchField(props: Props): JSX.Element {
    const { value, onSelect } = props;
    const { searchPhrase, setSearchPhrase } = useState('');

    const [projects, setProjects] = useState<Project[]>([]);

    const handleSearch = (searchValue: string): void => {
        if (searchValue) {
            core.projects.searchNames(searchValue).then((result: Project[]) => {
                if (result) {
                    setProjects(result);
                    setSearchPhrase(searchValue);
                }
            });
        } else {
            setProjects([]);
        }
    };

    const handleFocus = (): void => {
        if (!projects.length) {
            core.projects.searchNames().then((result: Project[]) => {
                if (result) {
                    setProjects(result);
                }
            });
        }
    };

    useEffect(() => {
        if (value && !projects.filter((project) => project.id === value).length) {
            core.projects.get({ id: value }).then((result: Project[]) => {
                const [project] = result;
                setProjects([...projects, {
                    id: project.id,
                    name: project.name,
                }]);
            });
        }
    }, [value]);

    return (
        <Autocomplete
            value={searchPhrase}
            placeholder='Select project'
            onSearch={handleSearch}
            onSelect={(_value) => onSelect(_value ? +_value : null)}
            className='cvat-project-search-field'
            onFocus={handleFocus}
        >
            {projects.map((proj) => (
                <Autocomplete.Option key={proj.id} value={proj.id.toString()}>
                    {proj.name}
                </Autocomplete.Option>
            ))}
        </Autocomplete>
    );
}
