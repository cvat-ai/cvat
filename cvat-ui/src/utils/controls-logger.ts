// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCore } from 'cvat-core-wrapper';
import { LogType } from 'cvat-logger';
import config from 'config';

const core = getCore();
const { CONTROLS_LOGS_INTERVAL } = config;

const classFilter = ['ant-btn'];
const parentClassFilter = ['ant-btn'];

class EventRecorder {
    #savingInterval: number | null;
    public constructor() {
        this.#savingInterval = null;
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
            classes: element.className,
        };

        if (!toRecord && element.parentElement) {
            element = element.parentElement;
            toRecord = this.isEventToBeRecorded(element, parentClassFilter);
            logData.classes = element.className;
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

    private isEventToBeRecorded(node: HTMLElement, filter: string[]): boolean {
        return filter.some((cssClass: string) => node.classList.contains(cssClass));
    }
}

export default new EventRecorder();
