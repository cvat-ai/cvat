// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const fs = require('fs');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const RuntimeModule = require('webpack/lib/RuntimeModule');
const YAML = require('yaml');

const POLICY_PROFILES = new Set(['cvat-csp', 'cvat-csp-next']);

/**
 * A mapping of CSP directive names to their source lists.
 * @typedef {Record<string, string[]>} CSPPolicy
 * @example
 * const policy = {
 *     'default-src': ["'none'"],
 *     'script-src': ["'self'", "'wasm-unsafe-eval'"],
 * };
 */

/**
 * A mapping of context names, such as `mainSpa` or `videoDecoderWorker`, to CSP policies.
 * @typedef {Record<string, CSPPolicy>} CSPPolicyContexts
 * @example
 * const contexts = {
 *     mainSpa: {
 *         'default-src': ["'none'"],
 *     },
 * };
 */

/**
 * A mapping of CSP profile names to their context-specific policies.
 * @typedef {Record<string, CSPPolicyContexts>} CSPPolicyRegistry
 * @example
 * const registry = {
 *     'cvat-csp': {
 *         mainSpa: {
 *             'default-src': ["'none'"],
 *         },
 *     },
 * };
 */

/**
 * Validates the source list for a CSP directive.
 *
 * @param {unknown} sources - Expected list of non-empty source strings.
 * @param {string} context - CSP context that owns the directive.
 * @param {string} directive - CSP directive name.
 * @returns {void}
 */
function validateDirectiveSources(sources, context, directive) {
    if (!Array.isArray(sources) || sources.some((source) => typeof source !== 'string' || !source)) {
        throw new Error(`Invalid sources for CSP directive ${directive} in context ${context}`);
    }
}

/**
 * Reads and validates a YAML CSP policy registry.
 *
 * @param {string} registryPath - Path to a registry mapping profiles to context-specific policies.
 * @returns {CSPPolicyRegistry} The validated policy registry.
 */
function loadPolicyRegistry(registryPath) {
    const contents = fs.readFileSync(path.resolve(registryPath), 'utf8');
    const registry = YAML.parse(contents);

    if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
        throw new Error('CSP policy registry must be a mapping');
    }

    for (const profile of POLICY_PROFILES) {
        if (!registry[profile] || typeof registry[profile] !== 'object' || Array.isArray(registry[profile])) {
            throw new Error(`CSP policy registry is missing ${profile}`);
        }

        for (const [context, policy] of Object.entries(registry[profile])) {
            if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
                throw new Error(`Invalid CSP policy for context ${context}`);
            }

            for (const [directive, sources] of Object.entries(policy)) {
                validateDirectiveSources(sources, context, directive);
            }
        }
    }

    return registry;
}

/**
 * Merges optional directive sources into a context policy and serializes it as a CSP header value.
 *
 * @param {CSPPolicyRegistry} registry - Registry of profiles, contexts, directives, and source lists.
 * @param {string} profile - CSP profile name, for example `cvat-csp`.
 * @param {string} context - Context name within the selected profile, for example `mainSpa`.
 * @param {CSPPolicy} [additions={}] - Directive source lists to merge into the selected policy.
 * @returns {string} The serialized Content-Security-Policy value.
 */
function renderPolicy(registry, profile, context, additions = {}) {
    if (!POLICY_PROFILES.has(profile)) {
        throw new Error(`Unknown CSP policy profile: ${profile}`);
    }

    const policy = registry[profile]?.[context];
    if (!policy) {
        throw new Error(`CSP policy profile ${profile} has no ${context} context`);
    }

    const directives = new Map(Object.entries(policy).map(([directive, sources]) => [directive, new Set(sources)]));
    for (const [directive, additionalSources] of Object.entries(additions)) {
        validateDirectiveSources(additionalSources, context, directive);
        const directiveSources = directives.get(directive) || new Set();
        for (const source of additionalSources) {
            directiveSources.add(source);
        }
        directives.set(directive, directiveSources);
    }

    return [...directives.entries()]
        .map(([directive, sources]) => (sources.size ? `${directive} ${[...sources].join(' ')}` : directive))
        .join('; ');
}

const CSP_MODE_TO_PROFILE = {
    enforce: 'cvat-csp',
    'report-only': 'cvat-csp-next',
};

const WORKER_CONTEXTS = [
    ['/assets/workers/imageUnzipWorker/', 'imageUnzipWorker'],
    ['/assets/workers/videoDecoderWorker/', 'videoDecoderWorker'],
    ['/assets/workers/downloadWorker/', 'downloadWorker'],
    ['/assets/workers/polygonSimplifierWorker/', 'polygonSimplifierWorker'],
    ['/assets/workers/samInferenceWorker/', 'samInferenceWorker'],
];

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
 * Resolves the configured CSP mode.
 *
 * @param {boolean} isDevMode - Whether webpack is running in development mode.
 * @param {string | undefined} cspMode - CSP mode passed through webpack's `--env` option.
 * @returns {'off' | 'enforce' | 'report-only'} The effective CSP mode.
 */
function getCSPMode(isDevMode, cspMode) {
    const mode = cspMode || process.env.CVAT_UI_CSP_MODE || (isDevMode ? 'enforce' : 'off');

    if (!['off', ...Object.keys(CSP_MODE_TO_PROFILE)].includes(mode)) {
        throw new Error('CVAT_UI_CSP_MODE must be one of: off, report-only, enforce');
    }

    return mode;
}

/**
 * Resolves the CSP context for a webpack development-server request.
 *
 * @param {{ url?: string }} request - Request with an optional URL.
 * @param {(pathname: string) => boolean} isProxiedPath - Whether a pathname is handled by the API proxy.
 * @returns {string | null} A CSP context name, or null for proxied requests.
 */
function getCSPContext(request, isProxiedPath) {
    const requestURL = new URL(request.url || '/', 'http://localhost');
    const { pathname } = requestURL;
    const workerContext = WORKER_CONTEXTS.find(([prefix]) => pathname.startsWith(prefix));
    if (workerContext) {
        return workerContext[1];
    }

    if (!isProxiedPath(pathname)) {
        return 'mainSpa';
    }

    return null;
}

/**
 * Creates a function that returns CSP headers for webpack development-server requests.
 *
 * @param {'off' | 'enforce' | 'report-only'} mode - Effective CSP mode.
 * @param {(pathname: string) => boolean} isProxiedPath - Whether a pathname is handled by the API proxy.
 * @returns {(request: { url?: string }) => Record<string, string>} A getter for request-specific CSP headers.
 */
function cspHeadersGetterFactory(mode, isProxiedPath) {
    if (mode === 'off') {
        return () => ({});
    }

    const registryPath = path.resolve(__dirname, '..', 'helm-chart', 'files', 'csp', 'policy-registry.yaml');
    const registry = loadPolicyRegistry(registryPath);
    const profile = CSP_MODE_TO_PROFILE[mode];
    const headerName = mode === 'enforce' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only';
    const policies = new Map(WORKER_CONTEXTS.map(([, context]) => [
        context,
        renderPolicy(registry, profile, context),
    ]));
    policies.set('mainSpa', renderPolicy(registry, profile, 'mainSpa', {
        // Webpack's hot-reload client connects over WebSocket. This directive is never added to the registry.
        'connect-src': ['ws:'],
    }));

    return (request) => {
        const context = getCSPContext(request, isProxiedPath);
        return context ? { [headerName]: policies.get(context) } : {};
    };
}

module.exports = {
    CSPWorkerViolationBootstrapPlugin,
    CSPViolationBootstrapPlugin,
    cspHeadersGetterFactory,
    getCSPMode,
};
