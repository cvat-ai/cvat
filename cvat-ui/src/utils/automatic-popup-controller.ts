// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

interface PopupSource {
    priority: number;
    eligibilityResolved: boolean;
    tryShow: (() => boolean) | null;
}

/**
 * Coordinates one automatic popup for the current account within the loaded app.
 * Register every source before starting asynchronous eligibility checks, then call
 * offer() once each check settles, including when there is nothing to show.
 * Higher numeric priorities run first; unresolved eligibility holds back lower priorities.
 * Once a popup opens or consume() is called, later offers cannot open or replace a popup.
 * Changing accounts resets the controller; reloading the page creates a fresh instance.
 */
class AutomaticPopupController {
    private sources = new Map<string, PopupSource>();
    private userId: number | null = null;
    private automaticOpeningConsumed = false;
    private refreshScheduled = false;

    /** Register a source before its eligibility check starts. Repeated registration is harmless. */
    public register(id: string, priority: number): void {
        if (!this.sources.has(id)) {
            this.sources.set(id, { priority, eligibilityResolved: false, tryShow: null });
        }
    }

    /** Reset eligibility and the opening allowance when the signed-in account changes. */
    public setUser(userId: number | null): void {
        if (this.userId === userId) return;
        this.userId = userId;
        this.automaticOpeningConsumed = false;
        for (const [id, source] of this.sources) {
            this.sources.set(id, { ...source, eligibilityResolved: false, tryShow: null });
        }
    }

    /**
     * Resolve a registered source: null means ineligible; a callback tries to open its popup.
     * The callback returns true after opening, or false while blocked by another dialog.
     * A blocked source keeps its priority; call refresh() when the blocker clears.
     */
    public offer(id: string, tryShow: (() => boolean) | null): void {
        const source = this.sources.get(id);
        if (!source) return;
        source.eligibilityResolved = true;
        source.tryShow = tryShow;
        this.refresh();
    }

    /** Suppress further automatic openings, including after the user manually opens a popup. */
    public consume(): void {
        this.automaticOpeningConsumed = true;
    }

    /** Queue one eligibility pass, coalescing offers made before the callback runs. */
    public refresh(): void {
        if (this.refreshScheduled || this.automaticOpeningConsumed || this.userId === null) return;
        this.refreshScheduled = true;
        window.setTimeout(() => {
            this.refreshScheduled = false;
            this.tryOpenNextPopup();
        }, 0);
    }

    private tryOpenNextPopup(): void {
        if (this.automaticOpeningConsumed || this.userId === null || window.document.hidden) return;
        const prioritizedSources = [...this.sources.values()].sort((left, right) => right.priority - left.priority);
        for (const source of prioritizedSources) {
            // Wait for the higher-priority decision even if a lower-priority source is ready.
            if (!source.eligibilityResolved) return;
            if (!source.tryShow) continue;

            if (source.tryShow()) this.consume();
            // A temporarily blocked candidate must not be overtaken by a lower-priority popup.
            return;
        }
    }
}

export default new AutomaticPopupController();
