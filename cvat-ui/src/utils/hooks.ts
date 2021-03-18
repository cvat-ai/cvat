// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT
import { useRef, useEffect } from 'react';

// eslint-disable-next-line import/prefer-default-export
export function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}
