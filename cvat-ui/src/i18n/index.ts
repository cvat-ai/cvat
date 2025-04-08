import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import languageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { has, get, set } from 'lodash';
import { KeyMapItem } from 'utils/mousetrap-react';
import { registerComponentShortcuts } from '../actions/shortcuts-actions';

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

function patch(
    fromObj: Record<string | number, any>, toObj: Record<any, any>,
    from: string | number, to: string | number,
): void {
    if (has(toObj, to)) {
        // toObj[to] = fromObj[from] || fromObj
        set(toObj, to, get(fromObj, from, fromObj));
    }
}

function makePatch(path: string | string[] | Record<string | number, string | number>) {
    return (ff: any, tt: Record<any, any>): void => {
        if (typeof path === 'string') {
            patch(ff, tt, path, path);
        }
        if (Array.isArray(path)) {
            path.forEach((p) => patch(ff, tt, p, p));
        }
        Object.entries(path).forEach(([from, to]) => patch(ff, tt, from, to));
    };
}

/**
 * When locale Changed
 *
 * load {ns}:{key} as a map K => V
 *
 * update each target[K]'s {path} to V
 *
 * @example single string path
 * 1. origin `target` = {
 *     a: {x: 'xa', y: 1},
 *     b: {x: 'xb', y: 2},
 *     c: {x: 'xc', y: 2},
 * }
 * 2. calling `patchPathForLocaleOn(target, 'x', 'KEY', 'NS')`
 * 3. new locale has a resource ns=NS key=KEY is
 * {
 *   a: 'A',
 *   b: 'B'
 * }
 * 4. target will set to {
 *     a: {x: 'A', y: 1},
 *     b: {x: 'B', y: 2},
 *     c: {x: 'xc', y: 2},
 * }
 * @example path Array
 * 1. origin `target` = {
 *     a: {x: 'xa', y: 1},
 *     b: {x: 'xb', y: 2},
 *     c: {x: 'xc', y: 2},
 * }
 * 2. calling `patchPathForLocaleOn(target, ['x', 'y'], 'KEY', 'NS')`
 * 3. new locale has a resource ns=NS key=KEY is
 *   {
 *     a: {x: 'A', y: 'AY'},
 *     b: {x: 'B'}
 *   }
 * 4. target will set to {
 *     a: {x: 'A', y: 'AY'},
 *     b: {x: 'B', y: 2},
 *     c: {x: 'xc', y: 2},
 * }
 *
 * @params {Object} target targetObject
 * @params {string| string[]} path
 * @params {string} key
 * @params {string} ns
 * @return {OffFunction} OffFunction
 */
export function patchPathForLocaleOn(
    target: Record<any, any>,
    path: string | string[] | Record<string | number, string | number>,
    key: string,
    ns = defaultNS,
): OffFunction {
    const pp = makePatch(path);
    return onLanguageChanged((lng, { getResource }): void => {
        const info: Record<string, string | string[]> = getResource(lng, ns, key);
        if (!info) {
            return;
        }

        Object.entries(info).forEach(([infoKey]) => {
            if (infoKey in target) {
                pp(info[infoKey], target[infoKey]);
            }
        });
    });
}

/**
 * When Locale changed,
 * patch on Shortcut config like
 * ```js
 * const componentShortcuts = {
 *     TOGGLE_ANNOTATION_PAGE: {
 *         name: 'Toggle layout grid',
 *         description: 'The grid is used to UI development',
 *         sequences: ['ctrl+alt+enter'],
 *         scope: ShortcutScope.GENERAL,
 *     },
 * };
 * patchShortcutsForLocaleOn(componentShortcuts);
 * // in locale resource header:settings.Shortcuts.TOGGLE_ANNOTATION_PAGE
 * "Shortcuts": {
 *     "TOGGLE_ANNOTATION_PAGE": ["NAME", "DESCRIPTION"]
 * }
 * ```
 * Using Array rather than object here for saving file space
 * @param target
 */
export function patchShortcutsForLocaleOn(target: Record<string, Record<'name' | 'description', string>>) {
    return patchPathForLocaleOn(target, { 0: 'name', 1: 'description' }, 'settings.Shortcuts', 'header');
}

/**
 * 1. regShortcuts
 * 2. auto patch new locale data
 * @param shortcuts
 */
export function registerComponentShortcutsWithAutoLocalePatch(shortcuts: Record<string, KeyMapItem>): OffFunction {
    registerComponentShortcuts(shortcuts);
    return patchShortcutsForLocaleOn(shortcuts);
}

export default i18n;
