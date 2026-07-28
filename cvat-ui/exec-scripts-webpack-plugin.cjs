// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const { spawn } = require('child_process');
const path = require('path');

class ExecScriptsPlugin {
    /**
     * @param {Array<{ script: string, cwd?: string }>} scripts
     */
    constructor(scripts = []) {
        if (!Array.isArray(scripts)) {
            throw new TypeError('ExecScriptsPlugin: "scripts" must be an array');
        }

        this.scripts = scripts;
    }

    /**
     * Execute a single Node.js script.
     * @param {string} scriptPath
     * @param {string | undefined} cwd
     * @returns {Promise<void>}
     */
    runScript(scriptPath, cwd) {
        return new Promise((resolve, reject) => {
            const resolvedScript = path.resolve(scriptPath);

            const child = spawn(process.execPath, [resolvedScript], {
                cwd: cwd ? path.resolve(cwd) : undefined,
                stdio: 'inherit',
            });

            child.once('error', (error) => {
                reject(
                    new Error(
                        `ExecScriptsPlugin: failed to start script "${resolvedScript}": ${error.message}`,
                    ),
                );
            });

            child.once('exit', (code) => {
                if (code === 0) {
                    resolve();
                    return;
                }

                reject(
                    new Error(
                        `ExecScriptsPlugin: script "${resolvedScript}" exited with code ${code}`,
                    ),
                );
            });
        });
    }

    /**
     * Execute all configured scripts sequentially.
     * @returns {Promise<void>}
     */
    async runScripts() {
        for (const { script, cwd } of this.scripts) {
            await this.runScript(script, cwd);
        }
    }

    /**
     * Webpack plugin entry point.
     * @param {import('webpack').Compiler} compiler
     */
    apply(compiler) {
        const pluginName = ExecScriptsPlugin.name;

        compiler.hooks.beforeRun.tapPromise(pluginName, () => this.runScripts());
        compiler.hooks.watchRun.tapPromise(pluginName, () => this.runScripts());
    }
}

module.exports = ExecScriptsPlugin;
