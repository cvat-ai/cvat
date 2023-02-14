// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCore } from 'cvat-core-wrapper';
import { LogType } from 'cvat-logger';

const core = getCore();

const classFilter = ['ant-btn'];
const parentClassFilter = ['ant-btn'];

class ControlsLogger {
    private savingInterval: any;

    public log(event: MouseEvent): void {
        const { target } = event;
        if (!target) return;

        const element = (target as HTMLElement);
        const { parentElement } = element;

        const parentCorrespondes = parentElement ? this.nodeCorrespondes(parentElement, parentClassFilter) : false;
        const elementCorrespondes = this.nodeCorrespondes(element, classFilter);

        if (parentCorrespondes || elementCorrespondes) {
            const logData: Record<string, string | null> = {
                text: null,
                classes: null,
            };
            logData.text = element?.innerText;
            logData.classes = element?.className;

            if (parentElement && parentCorrespondes) {
                logData.classes = parentElement?.className;
            }

            core.logger.log(LogType.clickElement, {
                obj_val: logData.text,
                obj_name: logData.classes,
            }, false);
        }
    }

    public initSave(): void {
        if (this.savingInterval) return;
        this.savingInterval = setInterval(() => {
            core.logger.save();
        }, 5000);
    }

    private nodeCorrespondes(node: HTMLElement, filter: string[]): boolean {
        return filter.some((cssClass: string) => node.classList.contains(cssClass));
    }
}

export default new ControlsLogger();
