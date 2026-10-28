// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    createContext, useCallback, useContext, useMemo, useState,
} from 'react';

const TableStateContext = createContext<Map<string, unknown> | null>(null);

// The owner controls the lifetime: loading may replace its children without losing preferences.
export function TableStateProvider({ children, scope }: {
    children: React.ReactNode;
    scope: string;
}): JSX.Element {
    const memory = useMemo(() => new Map<string, unknown>(), [scope]);
    return <TableStateContext.Provider value={memory}>{children}</TableStateContext.Provider>;
}

export function useTableState<T>(key: string | undefined, initial: T): [T, (next: T) => void] {
    const memory = useContext(TableStateContext);
    const [local, setLocal] = useState({ memory, key, value: initial });
    if (local.memory !== memory || local.key !== key) {
        setLocal({ memory, key, value: initial });
    }
    let value = local.memory === memory && local.key === key ? local.value : initial;
    if (key && memory?.has(key)) value = memory.get(key) as T;
    const update = useCallback((next: T): void => {
        if (key && memory) memory.set(key, next);
        setLocal({ memory, key, value: next });
    }, [key, memory]);
    return [value, update];
}
