// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    createContext, useCallback, useContext, useState,
} from 'react';

const ScopedStateContext = createContext<Map<string, unknown> | null>(null);

// Values survive consumer remounts until the provider unmounts or its scope changes.
export function ScopedStateProvider({ children, scope }: {
    children: React.ReactNode;
    scope: string;
}): JSX.Element {
    const [store, setStore] = useState(() => ({ scope, memory: new Map<string, unknown>() }));
    if (store.scope !== scope) {
        setStore({ scope, memory: new Map<string, unknown>() });
    }
    return <ScopedStateContext.Provider value={store.memory}>{children}</ScopedStateContext.Provider>;
}

export function useScopedState<T>(key: string | undefined, initial: T): [T, (next: T) => void] {
    const memory = useContext(ScopedStateContext);
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
