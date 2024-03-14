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

export interface EventRecorderConfiguration {
    savingEnabled: boolean;
}

class EventRecorder {
    #savingTimeout: number | null;
    #configuration: EventRecorderConfiguration;

    public constructor() {
        this.#savingTimeout = null;
        this.#configuration = {
            savingEnabled: false,
        };
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

    public configure(configuration: EventRecorderConfiguration): void {
        this.onConfigurationChange(configuration);
        this.#configuration = {
            ...this.#configuration,
            ...configuration,
        };
    }

    private onConfigurationChange(newConfiguration: EventRecorderConfiguration): void {
        const { savingEnabled } = newConfiguration;
        if (savingEnabled !== this.#configuration.savingEnabled) {
            this.setupSavingTimeout(savingEnabled);
        }
    }

    private setupSavingTimeout(enable: boolean): void {
        if (enable) {
            if (this.#savingTimeout) return;

            this.#savingTimeout = window.setTimeout(() => {
                core.logger.save().finally(() => {
                    this.#savingTimeout = null;
                    this.setupSavingTimeout(true);
                });
            }, CONTROLS_LOGS_INTERVAL);
        } else if (this.#savingTimeout) {
            clearTimeout(this.#savingTimeout);
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
