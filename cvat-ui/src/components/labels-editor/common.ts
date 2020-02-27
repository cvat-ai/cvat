// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

export interface Attribute {
    id: number;
    name: string;
    type: string;
    mutable: boolean;
    values: string[];
}

export interface Label {
    name: string;
    id: number;
    attributes: Attribute[];
}

let id = 0;

export function idGenerator(): number {
    return --id;
}

export function equalArrayHead(arr1: string[], arr2: string[]): boolean {
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }

    return true;
}
