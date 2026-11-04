// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

type CapabilityCallback = (allowed: boolean) => void;
type CapabilityUnsubscribe = () => void;

export function observe(_name: string, callback: CapabilityCallback): CapabilityUnsubscribe {
    callback(true);
    return () => {};
}
