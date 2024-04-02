// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCore } from 'cvat-core-wrapper';
import { EventScope } from 'cvat-logger';
import config from 'config';
import { platformInfo } from 'utils/platform-checker';

const core = getCore();
const { CONTROLS_LOGS_INTERVAL } = config;

const classFilter = ['ant-btn'];
const parentClassFilter = ['ant-btn'];

class EventRecorder {
    #savingTimeout: number | null;

    public constructor() {
        this.#savingTimeout = null;
        core.logger.log(EventScope.loadTool, {
            location: window.location.pathname + window.location.search,
            platform: platformInfo(),
        });
    }

    public log(event: MouseEvent): void {
        const { target } = event;
        if (!target) {
            return;
        }

        let element = (target as HTMLElement);
        let toRecord = this.isEventToBeRecorded(element, classFilter);

        const logData = {
            text: element.innerText,
            classes: this.filterClassName(element.className),
            location: window.location.pathname + window.location.search,
        };

        if (!toRecord && element.parentElement) {
            element = element.parentElement;
            toRecord = this.isEventToBeRecorded(element, parentClassFilter);
            logData.classes = this.filterClassName(element.className);
        }

        if (toRecord) {
            core.logger.log(EventScope.clickElement, logData, false);
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
                .catch((error) => {
                    if (error?.code === 401) {
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

    private filterClassName(cls: string): string {
        if (typeof cls === 'string') {
            return cls.split(' ').filter((_cls: string) => _cls.startsWith('cvat')).join(' ');
        }

        return '';
    }

    private isEventToBeRecorded(node: HTMLElement, filter: string[]): boolean {
        return filter.some((cssClass: string) => node.classList.contains(cssClass));
    }
}

export default new EventRecorder();
