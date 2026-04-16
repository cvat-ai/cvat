// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ArgumentError } from './exceptions';

type WrappedFunction = ((...args: unknown[]) => unknown) & {
    implementation?: (...args: unknown[]) => unknown;
};

type PluginDecorator = {
    callback?: WrappedFunction;
    enter?: (
        plugin: RegisteredPlugin,
        ...args: unknown[]
    ) => Promise<APIWrapperEnterOptions | undefined> | APIWrapperEnterOptions | undefined;
    leave?: (
        plugin: RegisteredPlugin,
        result: unknown,
        ...args: unknown[]
    ) => Promise<unknown> | unknown;
};

type RegisteredPlugin = Record<string, unknown> & {
    functions: PluginDecorator[];
};

const plugins: RegisteredPlugin[] = [];

export interface APIWrapperEnterOptions {
    preventMethodCall?: boolean;
    preventMethodCallWithReturn?: unknown;
}

export default class PluginRegistry {
    static async apiWrapper(wrappedFunc: WrappedFunction, ...args: unknown[]) {
        const pluginList = await PluginRegistry.list();
        const aggregatedOptions: APIWrapperEnterOptions = {
            preventMethodCall: false,
        };

        for (const plugin of pluginList) {
            const pluginDecorators = plugin.functions.filter((obj) => obj.callback === wrappedFunc)[0];
            if (pluginDecorators && pluginDecorators.enter) {
                const options: APIWrapperEnterOptions | undefined = await pluginDecorators
                    .enter.call(this, plugin, ...args);
                if (options instanceof Object) {
                    if ('preventMethodCallWithReturn' in options) {
                        aggregatedOptions.preventMethodCallWithReturn = options.preventMethodCallWithReturn;
                    }

                    if ('preventMethodCall' in options) {
                        aggregatedOptions.preventMethodCall = true;
                    }
                }
            }
        }

        let result = null;
        if ('preventMethodCallWithReturn' in aggregatedOptions) {
            result = aggregatedOptions.preventMethodCallWithReturn;
        } else if (!aggregatedOptions.preventMethodCall) {
            if (typeof wrappedFunc.implementation !== 'function') {
                throw new Error('Wrapped API function implementation is not registered');
            }

            result = await wrappedFunc.implementation.call(this, ...args);
        }

        for (const plugin of pluginList) {
            const pluginDecorators = plugin.functions.filter((obj) => obj.callback === wrappedFunc)[0];
            if (pluginDecorators && pluginDecorators.leave) {
                result = await pluginDecorators.leave.call(this, plugin, result, ...args);
            }
        }

        return result;
    }

    // Called with cvat context
    static async register(plug: Record<string, unknown>) {
        const functions: PluginDecorator[] = [];

        if (typeof plug !== 'object') {
            throw new ArgumentError(`Plugin should be an object, but got "${typeof plug}"`);
        }

        if (!('name' in plug) || typeof plug.name !== 'string') {
            throw new ArgumentError('Plugin must contain a "name" field and it must be a string');
        }

        if (!('description' in plug) || typeof plug.description !== 'string') {
            throw new ArgumentError('Plugin must contain a "description" field and it must be a string');
        }

        if ('functions' in plug) {
            throw new ArgumentError('Plugin must not contain a "functions" field');
        }

        function traverse(plugin: Record<string, unknown>, api: Record<string, unknown> | WrappedFunction): void {
            const decorator: PluginDecorator = {};
            for (const key in plugin) {
                if (Object.prototype.hasOwnProperty.call(plugin, key)) {
                    if (typeof plugin[key] === 'object' && plugin[key] !== null) {
                        if (typeof api !== 'function' && Object.prototype.hasOwnProperty.call(api, key)) {
                            traverse(
                                plugin[key] as Record<string, unknown>,
                                api[key] as Record<string, unknown> | WrappedFunction,
                            );
                        }
                    } else if (
                        ['enter', 'leave'].includes(key) &&
                        typeof api === 'function' &&
                        typeof plugin[key] === 'function'
                    ) {
                        decorator.callback = api;
                        decorator[key as 'enter' | 'leave'] = plugin[key] as PluginDecorator['enter'];
                    }
                }
            }

            if (Object.keys(decorator).length) {
                functions.push(decorator);
            }
        }

        traverse(plug, { cvat: this as unknown as Record<string, unknown> });

        const registeredPlugin = plug as RegisteredPlugin;
        Object.defineProperty(registeredPlugin, 'functions', {
            value: functions,
            writable: false,
        });

        plugins.push(registeredPlugin);
    }

    static async list() {
        return plugins;
    }
}
