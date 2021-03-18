// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT
import { useRef, useEffect } from 'react';

// eslint-disable-next-line import/prefer-default-export
export function usePrevious(value: any): any {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}
