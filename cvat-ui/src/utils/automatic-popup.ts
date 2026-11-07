// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

interface Source {
    priority: number;
    ready: boolean;
    show: (() => boolean) | null;
}

// Shared by the star prompt and optional UI plugins. A higher-priority source
// can finish loading before a lower-priority prompt is allowed to open.
class AutomaticPopups {
    private sources = new Map<string, Source>();
    private userId: number | null = null;
    private consumed = false;
    private scheduled = false;

    public register(id: string, priority: number): void {
        if (!this.sources.has(id)) this.sources.set(id, { priority, ready: false, show: null });
    }

    public setUser(userId: number | null): void {
        if (this.userId === userId) return;
        this.userId = userId;
        this.consumed = false;
        for (const [id, source] of this.sources) {
            this.sources.set(id, { ...source, ready: false, show: null });
        }
    }

    public offer(id: string, show: (() => boolean) | null): void {
        const source = this.sources.get(id);
        if (!source) return;
        source.ready = true;
        source.show = show;
        this.refresh();
    }

    public consume(): void {
        this.consumed = true;
    }

    public refresh(): void {
        if (this.scheduled || this.consumed || this.userId === null) return;
        this.scheduled = true;
        window.setTimeout(() => {
            this.scheduled = false;
            if (this.consumed || this.userId === null || window.document.hidden) return;
            const sources = [...this.sources.values()].sort((left, right) => right.priority - left.priority);
            for (const source of sources) {
                if (!source.ready) return;
                if (source.show) {
                    // False means the candidate is waiting for another dialog.
                    if (source.show()) this.consumed = true;
                    return;
                }
            }
        }, 0);
    }
}

export default new AutomaticPopups();
