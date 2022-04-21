// Copyright (C) 2019-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import Autocomplete from 'antd/lib/auto-complete';

import consts from 'consts';
import getCore from 'cvat-core-wrapper';

const core = getCore();

interface Props {
    projectId: number;
    projectSubsets?: Array<string>;
    value: string;
    onChange: (value: string) => void;
}

interface ProjectPartialWithSubsets {
    id: number;
    subsets: Array<string>;
}

export default function ProjectSubsetField(props: Props): JSX.Element {
    const {
        projectId, projectSubsets, value, onChange,
    } = props;

    const [internalValue, setInternalValue] = useState('');
    const [internalSubsets, setInternalSubsets] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!projectSubsets?.length && projectId) {
            core.projects.get({ id: projectId }).then((response: ProjectPartialWithSubsets[]) => {
                if (response.length) {
                    const [project] = response;
                    setInternalSubsets(
                        new Set([
                            ...(internalValue ? [internalValue] : []),
                            ...consts.DEFAULT_PROJECT_SUBSETS,
                            ...project.subsets,
                        ]),
                    );
                }
            });
        } else {
            setInternalSubsets(
                new Set([
                    ...(internalValue ? [internalValue] : []),
                    ...consts.DEFAULT_PROJECT_SUBSETS,
                    ...(projectSubsets || []),
                ]),
            );
        }
    }, [projectId, projectSubsets]);

    useEffect(() => {
        setInternalValue(value);
    }, [value]);

    return (
        <Autocomplete
            value={internalValue}
            placeholder='Input subset'
            className='cvat-project-search-field cvat-project-subset-field'
            onSearch={(_value) => setInternalValue(_value)}
            onSelect={(_value) => {
                if (_value !== internalValue) {
                    onChange(_value);
                }
                setInternalValue(_value);
            }}
            onBlur={() => onChange(internalValue)}
            options={Array.from(new Set([...(internalValue ? [internalValue] : []), ...internalSubsets])).map(
                (subset) => ({
                    value: subset,
                    label: subset,
                }),
            )}
        />
    );
}
