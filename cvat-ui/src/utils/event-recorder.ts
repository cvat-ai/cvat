// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ServerError, getCore } from 'cvat-core-wrapper';
import { EventScope } from 'cvat-logger';
import config from 'config';
import { platformInfo } from 'utils/platform-checker';

const core = getCore();
const { CONTROLS_LOGS_INTERVAL } = config;

interface Logger {
    log(...parameters: Parameters<typeof core.logger.log>): ReturnType<typeof core.logger['log']>;
}

const defaultLogger: Logger = core.logger;

// the class is responsible for logging general mouse events
// and for saving recorded events to the server with a certain period
class EventRecorder {
    #savingTimeout: number | null;
    #logger: Logger | null;

    public constructor() {
        this.#savingTimeout = null;
        this.#logger = null;
        core.logger.log(EventScope.loadTool, {
            location: window.location.pathname,
            platform: platformInfo(),
        });
    }

    public recordMouseEvent(event: MouseEvent): void {
        const elementToRecord = this.isEventToBeRecorded(event.target as HTMLElement | null, ['ant-btn']);
        if (elementToRecord) {
            (this.#logger || defaultLogger).log(EventScope.clickElement, {
                obj_val: elementToRecord.innerText,
                obj_name: this.filterClassName(elementToRecord.className),
                location: window.location.pathname,
            }, false);
        }
    }

    public initSave(): void {
        if (this.#savingTimeout) return;
        this.#savingTimeout = window.setTimeout(() => {
            const scheduleSave = (): void => {
                this.#savingTimeout = null;
                this.initSave();
            };

            core.logger.save()
                .then(scheduleSave)
                .catch((error: unknown) => {
                    if (error instanceof ServerError && error.code === 401) {
                        this.cancelSave();
                    } else {
                        scheduleSave();
                    }
                });
        }, CONTROLS_LOGS_INTERVAL);
    }

    public cancelSave(): void {
        if (this.#savingTimeout) {
            window.clearTimeout(this.#savingTimeout);
            this.#savingTimeout = null;
        }
    }

    public set logger(logger: Logger | null) {
        this.#logger = logger;
    }

    private filterClassName(cls: string): string {
        if (typeof cls === 'string') {
            return cls.split(/\s+/).filter((_cls: string) => _cls.startsWith('cvat')).join(' ');
        }

        return '';
    }

    private isEventToBeRecorded(element: HTMLElement | null, cssFilter: string[], maxDepth = 5): HTMLElement | null {
        if (!element) {
            return null;
        }

        const { classList } = element;
        if (cssFilter.some((cssClass: string) => classList.contains(cssClass))) {
            return element;
        }

        return this.isEventToBeRecorded(element.parentElement, cssFilter, maxDepth - 1);
    }
}

export default new EventRecorder();
