// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCore } from 'cvat-core-wrapper';
import { LogType } from 'cvat-logger';
import config from 'config';
import { platformInfo } from 'utils/platform-checker';

const core = getCore();
const { CONTROLS_LOGS_INTERVAL } = config;

const classFilter = ['ant-btn'];
const parentClassFilter = ['ant-btn'];

class EventRecorder {
    #savingInterval: number | null;
    public constructor() {
        this.#savingInterval = null;
        core.logger.log(LogType.loadTool, {
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
            core.logger.log(LogType.clickElement, logData, false);
        }
    }

    public initSave(): void {
        if (this.#savingInterval) return;
        this.#savingInterval = setInterval(() => {
            core.logger.save();
        }, CONTROLS_LOGS_INTERVAL) as unknown as number;
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
