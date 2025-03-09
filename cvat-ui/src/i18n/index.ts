import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import languageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

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

export default i18n;
