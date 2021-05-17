// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

export interface Master {
    subscribe(listener: Listener): void;
    unsubscribe(listener: Listener): void;
    unsubscribeAll(): void;
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

    public unsubscribe(listener: Listener): void {
        for (let i = 0; i < this.listeners.length; i++) {
            if (this.listeners[i] === listener) {
                this.listeners.splice(i, 1);
            }
        }
    }

    public unsubscribeAll(): void {
        this.listeners = [];
    }

    public notify(reason: string): void {
        for (const listener of this.listeners) {
            listener.notify(this, reason);
        }
    }
}
