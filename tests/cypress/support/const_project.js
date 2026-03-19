// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export const projectName = 'Main project';
export const projectName3d = 'Main project 3D';
export const projectNameDelete = 'Delete this project';
export const projectNameDeleteLabel = 'Delete Label';
export const labelNameDelete = 'Delete this label';
export const labelName = `Base label for ${projectName}`;
export const labelDelete = {
    name: labelNameDelete,
    attributes: [],
    mutable: false,
    type: 'any',
    color: 'red',
};
export const attrName = `Attr for ${labelName}`;
export const textDefaultValue = 'Some default value for type Text';
export const multiAttrParams = {
    name: 'Attr 2',
    values: 'Attr value 2',
    type: 'text',
};
export const ADMIN_ID = 1;

// Reusable specs
export const projectSpec = {
    name: projectName,
    labels: [
        {
            name: labelName,
            type: 'any',
            attributes: [
                {
                    name: multiAttrParams.name,
                    default_value: textDefaultValue,
                    values: [multiAttrParams.values],
                    input_type: multiAttrParams.type,
                    mutable: false,
                },
                {
                    mutable: false,
                    name: attrName,
                    values: [],
                    default_value: textDefaultValue,
                    input_type: 'text',
                },
            ],
        },
    ],
};
export const project3d = { ...projectSpec, name: projectName3d };
export const projectDeleteLabelSpec = {
    name: projectNameDeleteLabel,
    labels: [
        labelDelete,
    ],
};
export const projectDeleteSpec = {
    ...projectSpec,
    name: projectNameDelete,
};
