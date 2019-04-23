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
            const pluginList = await global.cvat.plugins.list.implementation();
            for (const plugin of pluginList) {
                const pluginDecorators = plugin.functions
                    .filter(obj => obj.callback === wrappedFunc)[0];
                if (pluginDecorators && pluginDecorators.enter) {
                    pluginDecorators.enter(plugin, ...args);
                }
            }

            let result = await wrappedFunc.implementation.call(this, ...args);

            for (const plugin of pluginList) {
                const pluginDecorators = plugin.functions
                    .filter(obj => obj.callback === wrappedFunc)[0];
                if (pluginDecorators && pluginDecorators.leave) {
                    result = pluginDecorators.leave(plugin, result, ...args);
                }
            }

            return result;
        }

        static async register() {
            // TODO
        }

        static async list() {
            return plugins;
        }
    }

    module.exports = PluginRegistry;
})();
