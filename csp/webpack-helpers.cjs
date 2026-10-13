// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const HtmlWebpackPlugin = require('html-webpack-plugin');
const RuntimeModule = require('webpack/lib/RuntimeModule');

const MAIN_SPA_POLICY = `
    default-src 'none';
    object-src 'none';
    base-uri 'none';
    frame-ancestors 'none';
    script-src 'self' 'unsafe-eval';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: blob:;
    media-src 'self' blob:;
    connect-src 'self'
    data: ws:;
    worker-src 'self';
`.replace(/\s+/g, ' ').trim();
const WORKER_POLICY = `
    default-src 'none';
    script-src 'self' 'unsafe-eval';
    connect-src 'self' data:;
`.replace(/\s+/g, ' ').trim();
const CSP_MODE_TO_HEADER = {
    enforce: 'Content-Security-Policy',
    report: 'Content-Security-Policy-Report-Only',
};

const CSP_VIOLATION_BOOTSTRAP_ENTRY = 'csp-violation-bootstrap';
const CSP_WORKER_VIOLATION_MESSAGE_TYPE = '__cvat_csp_violation__';

class CSPWorkerViolationPreludeRuntimeModule extends RuntimeModule {
    constructor() {
        super('csp worker violation prelude', -100);
    }

    generate() {
        return `self.addEventListener('securitypolicyviolation', (event) => {\n` +
            `    self.postMessage({\n` +
            `        type: '${CSP_WORKER_VIOLATION_MESSAGE_TYPE}',\n` +
            `        violation: {\n` +
            `            blockedURI: event.blockedURI || '(inline)',\n` +
            `            columnNumber: event.columnNumber,\n` +
            `            disposition: event.disposition,\n` +
            `            effectiveDirective: event.effectiveDirective,\n` +
            `            lineNumber: event.lineNumber,\n` +
            `            sourceFile: event.sourceFile,\n` +
            `            violatedDirective: event.violatedDirective,\n` +
            `        },\n` +
            `    });\n` +
            `});\n`;
    }
}

class CSPWorkerViolationBootstrapPlugin {
    /**
     * Adds a CSP violation listener to selected worker entry chunks. The runtime module executes before
     * Webpack's startup code, which can load split chunks before the worker's source module runs.
     *
     * @param {RegExp} workerEntryPattern - Matches worker entry chunk names.
     */
    constructor(workerEntryPattern) {
        this.workerEntryPattern = workerEntryPattern;
    }

    /**
     * @param {import('webpack').Compiler} compiler - The active webpack compiler.
     * @returns {void}
     */
    apply(compiler) {
        compiler.hooks.compilation.tap('CSPWorkerViolationBootstrapPlugin', (compilation) => {
            compilation.hooks.additionalChunkRuntimeRequirements.tap(
                'CSPWorkerViolationBootstrapPlugin',
                (chunk) => {
                    if (!chunk.name || !this.workerEntryPattern.test(chunk.name)) {
                        return;
                    }

                    compilation.addRuntimeModule(chunk, new CSPWorkerViolationPreludeRuntimeModule());
                },
            );
        });
    }
}

class CSPViolationBootstrapPlugin {
    /**
     * Inserts the CSP observer bootstrap before other head resources.
     *
     * @param {import('webpack').Compiler} compiler - The active webpack compiler.
     * @returns {void}
     */
    apply(compiler) {
        compiler.hooks.compilation.tap('CSPViolationBootstrapPlugin', (compilation) => {
            HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tap('CSPViolationBootstrapPlugin', (data) => {
                const bootstrapEntrypoint = compilation.entrypoints.get(CSP_VIOLATION_BOOTSTRAP_ENTRY);
                const bootstrapScript = bootstrapEntrypoint?.getFiles().find((file) => file.endsWith('.js'));
                if (!bootstrapScript) {
                    throw new Error('CSP violation bootstrap script was not emitted');
                }

                data.html = data.html.replace('<head>', `<head>\n        <script src="/${bootstrapScript}"></script>`);
                return data;
            });
        });
    }
}

/**
 * Resolves the CSP mode for the webpack development server.
 *
 * @param {boolean} isDevMode - Whether webpack is running in development mode.
 * @param {string | undefined} cspMode - CSP mode passed through webpack's `--env` option.
 * @returns {'off' | 'report' | 'enforce'} The effective CSP mode.
 */
function getCSPMode(isDevMode, cspMode) {
    const mode = cspMode || process.env.CVAT_CSP_MODE || (isDevMode ? 'enforce' : 'off');
    return ['off', ...Object.keys(CSP_MODE_TO_HEADER)].includes(mode) ? mode : 'off';
}

/**
 * Resolves the CSP context for a webpack development-server request.
 *
 * @param {{ url?: string }} request - Request with an optional URL.
 * @param {(pathname: string) => boolean} isProxiedPath - Whether a pathname is handled by the API proxy.
 * @returns {'mainSpa' | 'worker' | null} A CSP context name, or null for proxied requests.
 */
function getCSPContext(request, isProxiedPath) {
    const requestURL = new URL(request.url || '/', 'http://localhost');
    const { pathname } = requestURL;
    if (pathname.startsWith('/assets/workers/')) {
        return 'worker';
    }

    if (!isProxiedPath(pathname)) {
        return 'mainSpa';
    }

    return null;
}

/**
 * Creates a function that returns CSP headers for webpack development-server requests.
 *
 * @param {'off' | 'report' | 'enforce'} mode - Effective CSP mode.
 * @param {(pathname: string) => boolean} isProxiedPath - Whether a pathname is handled by the API proxy.
 * @returns {(request: { url?: string }) => Record<string, string>} A getter for request-specific CSP headers.
 */
function cspHeadersGetterFactory(mode, isProxiedPath) {
    if (mode === 'off') {
        return () => ({});
    }

    const headerName = CSP_MODE_TO_HEADER[mode];

    return (request) => {
        const context = getCSPContext(request, isProxiedPath);
        if (!context) {
            return {};
        }

        return {
            [headerName]: context === 'worker' ? WORKER_POLICY : MAIN_SPA_POLICY,
        };
    };
}

module.exports = {
    CSPWorkerViolationBootstrapPlugin,
    CSPViolationBootstrapPlugin,
    cspHeadersGetterFactory,
    getCSPMode,
};
