// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import ErrorStackParser from 'error-stack-parser';
import { getCore } from 'cvat-core-wrapper';
import { getCVATStore } from 'cvat-store';
import { CombinedState } from 'reducers';

const core = getCore();
const { logger } = core;
const { EventScope } = core.enums;

const ignoredSources = ['snippet://', 'chrome-extension://'];

export function logError(
    error: unknown,
    save: boolean,
    extras: { type: string } & Record<string, unknown>,
): void {
    if (!(error instanceof Error)) {
        console.warn('Unknown error type caught', error);
        return;
    }
    // stack is not guaranteed by ECMA but
    // de facto implemented by all major JavaScript engines
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/stack
    if (error.stack) {
        const stackFrames = ErrorStackParser.parse(error);
        if (!stackFrames.length) {
            console.warn('Error cannot be logged. No stack frames found', error);
            return;
        }

        const filename = stackFrames[0].fileName;
        const payload = {
            filename,
            line: stackFrames[0].lineNumber,
            message: error.message,
            column: stackFrames[0].columnNumber,
            stack: error.stack,
            ...extras,
        };

        if (!filename || ignoredSources.some((source) => filename.startsWith(source))) {
            // filename is missing or the error comes from external script (extension, console, snippets, etc)
            console.warn('Error will not be logged as comes from external source', error);
            return;
        }

        const state: CombinedState = getCVATStore().getState();
        const { instance: job } = state.annotation.job;

        const onError = (_error: unknown): void => {
            const message = 'Error occurred during another error logging';
            console.error(message, _error instanceof Error ? _error.message : String(_error));
        };

        if (job) {
            job.logger.log(EventScope.exception, payload).catch(onError);
        } else {
            logger.log(EventScope.exception, payload).catch(onError);
        }

        if (save) {
            logger.save().catch(onError);
        }
    }
}

export default logger;
export { EventScope };
