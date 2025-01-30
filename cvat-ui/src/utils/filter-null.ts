// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Indexable } from 'reducers';

export function filterNull<Type>(obj: Type): Type {
    const filteredObject = { ...obj };
    if (filteredObject) {
        for (const key of Object.keys(filteredObject)) {
            if ((filteredObject as Indexable)[key] === null) {
                delete (filteredObject as Indexable)[key];
            }
        }
    }
    return filteredObject;
}
