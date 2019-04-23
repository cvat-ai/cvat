/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

/* global
    global:false
*/

(() => {
    const plugins = [];
    class PluginRegistry {
        static async apiWrapper(wrappedFunc, ...args) {
            // I have to optimize the wrapper
            const pluginList = await global.cvat.plugins.list.implementation();
            for (const plugin of pluginList) {
                const pluginDecorators = plugin.functions
                    .filter(obj => obj.callback === wrappedFunc)[0];
                if (pluginDecorators && pluginDecorators.enter) {
                    await pluginDecorators.enter(plugin, ...args);
                }
            }

            let result = await wrappedFunc.implementation.call(this, ...args);

            for (const plugin of pluginList) {
                const pluginDecorators = plugin.functions
                    .filter(obj => obj.callback === wrappedFunc)[0];
                if (pluginDecorators && pluginDecorators.leave) {
                    result = await pluginDecorators.leave(plugin, result, ...args);
                }
            }

            return result;
        }

        static async register(plug) {
            const functions = [];

            (function traverse(plugin, api) {
                if (typeof (plugin) !== 'object') {
                    throw Error(`Plugin should be an object, but got ${typeof (plugin)}`);
                }

                const decorator = {};
                for (const key in plugin) {
                    if (Object.prototype.hasOwnProperty.call(plugin, key)) {
                        if (typeof (plugin[key]) === 'object') {
                            if (Object.prototype.hasOwnProperty.call(api, key)) {
                                traverse(plugin[key], api[key]);
                            }
                        } else if (['enter', 'leave'].includes(key)
                            && typeof (api) === 'function'
                            && typeof (plugin[key] === 'function')) {
                            decorator.callback = api;
                            decorator[key] = plugin[key];
                        }
                    }
                }

                if (Object.keys(decorator).length) {
                    functions.push(decorator);
                }
            }(plug, {
                cvat: global.cvat,
            }));

            Object.defineProperty(plug, 'functions', {
                value: functions,
                writable: false,
            });

            plugins.push(plug);
        }

        static async list() {
            return plugins;
        }
    }

    module.exports = PluginRegistry;
})();
