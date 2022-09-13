// Copyright (C) 2019-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

export interface Master {
    subscribe(listener: Listener): void;
    notify(reason: string): void;
}

export interface Listener {
    notify(master: Master, reason: string): void;
}

export class MasterImpl implements Master {
    private listeners: Listener[];

    public constructor() {
        this.listeners = [];
    }

    public subscribe(listener: Listener): void {
        this.listeners.push(listener);
    }

    public notify(reason: string): void {
        for (const listener of this.listeners) {
            listener.notify(this, reason);
        }
    }
}
