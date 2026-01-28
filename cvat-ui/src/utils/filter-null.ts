// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Indexable } from 'reducers';

type NonNullableProperties<T> = {
    [K in keyof T]: NonNullable<T[K]>;
};

export function filterNull<Type>(obj: Type): NonNullableProperties<Type> {
    const filteredObject = { ...obj };
    if (filteredObject) {
        for (const key of Object.keys(filteredObject)) {
            if ((filteredObject as Indexable)[key] === null) {
                delete (filteredObject as Indexable)[key];
            }
        }
    }
    return filteredObject as NonNullableProperties<Type>;
}
