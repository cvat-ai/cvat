import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import languageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { has, set } from 'lodash';

import {
    supportedLanguages,
    fallbackLng,
    defaultNS,
    namespaceList,
    localeOptions,
} from './config';

export {
    namespaceList,
    localeOptions,
};

type I18next = typeof i18n;
type OffFunction = () => void;

// make sure only init one time
let firstRun = true;

async function init(): Promise<void> {
    if (!firstRun) {
        return;
    }
    firstRun = false;
    await i18n
        .use(initReactI18next)
        .use(languageDetector)
        .use(
            resourcesToBackend(
                async (language: string, namespace: string) => (
                    // eslint-disable-next-line no-unsanitized/method
                    import(
                        // webpack Magic comments;
                        // @see https://webpack.js.org/api/module-methods/#magic-comments
                        /* webpackInclude: /\.json/ */
                        /* webpackChunkName: "locales" */
                        /* webpackMode: "lazy-once" */
                        /* webpackPrefetch: true */
                        /* webpackPreload: true */
                        /* webpackFetchPriority: "low" */
                        `./locales/${namespace}/${language}.json`
                    )
                ),
            ),
        )
        .init({
            defaultNS,
            fallbackLng,
            supportedLngs: supportedLanguages,
            ns: namespaceList,
            debug: process.env.NODE_ENV === 'development',
            interpolation: {
                escapeValue: false,
            },
        });

    i18n.services.formatter!.add('upcase', (value: any, lng, options) => {
        const { num } = options;
        const n = num || 1;
        return value.charAt(n - 1).toUpperCase() + value.slice(n);
    });

    if (process.env.NODE_ENV === 'development') {
        console.info('i18next initialized');
        i18n.on('failedLoading', (lng, ns, msg) => console.error(msg));
        // just for debug;
        // @ts-ignore
        window.i18n = i18n;
    }
}

init();

/**
 * when language changed trigger other part
 *   which not in react component or function call
 *
 * 1. const defined string not in function call utils/validation-patterns.ts
 * 2. other lib
 * @param callback
 * @return {OffFunction} stopListenFunction
 */
export function onLanguageChanged(callback: (lng: string, i18n: I18next) => void): OffFunction {
    i18n.on('languageChanged', (lng) => callback(lng, i18n));
    return () => i18n.off('languageChanged', callback);
}

/**
 * When locale Changed
 *
 * load {ns}:{key} as a map K => V
 *
 * update each target[K]'s {path} to V
 *
 * @example
 * 1. origin `target` = {
 *     a: {x: 'xa', y: 1},
 *     b: {x: 'xb', y: 2},
 *     c: {x: 'xc', y: 2},
 * }
 * 2. calling `patchPathForLocaleOn(target, 'x', 'KEY', 'NS')`
 * 3. new locale has a resource ns=NS key=KEY contains {a: 'A', b: 'B'}
 * 4. target will set to {
 *     a: {x: 'A', y: 1},
 *     b: {x: 'B', y: 2},
 *     c: {x: 'xc', y: 2},
 * }
 * @params {Object} target targetObject
 * @params {string| string[]} path
 * @params {string} key
 * @params {string} ns
 * @return {OffFunction} OffFunction
 */
export function patchPathForLocaleOn(
    target: Record<any, any>,
    path: string | string[],
    key: string,
    ns = defaultNS,
): OffFunction {
    return onLanguageChanged((lng, { getResource }) => {
        const info: Record<string, string> = getResource(lng, ns, key);
        if (!info) {
            return;
        }
        const pathList = Array.isArray(path) ? path : [path];
        Object.entries(info).forEach(([infoKey, value]) => {
            if (infoKey in target) {
                pathList.forEach((p) => {
                    if (has(target[infoKey], p)) {
                        set(target[infoKey], p, value);
                    }
                });
            }
        });
    });
}

export default i18n;
