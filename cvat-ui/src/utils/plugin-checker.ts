// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import getCore from 'cvat-core-wrapper';
import { SupportedPlugins } from 'reducers/interfaces';

const core = getCore();

// Easy plugin checker to understand what plugins supports by a server
class PluginChecker {
    public static async check(plugin: SupportedPlugins): Promise<boolean> {
        const serverHost = core.config.backendAPI.slice(0, -7);
        const isReachable = async (url: string, method: string): Promise<boolean> => {
            try {
                await core.server.request(url, {
                    method,
                });
                return true;
            } catch (error) {
                return ![0, 404].includes(error.code);
            }
        };

        switch (plugin) {
            case SupportedPlugins.GIT_INTEGRATION: {
                return isReachable(`${serverHost}/git/repository/meta/get`, 'OPTIONS');
            }
            case SupportedPlugins.AUTO_ANNOTATION: {
                return isReachable(`${serverHost}/auto_annotation/meta/get`, 'OPTIONS');
            }
            case SupportedPlugins.TF_ANNOTATION: {
                return isReachable(`${serverHost}/tensorflow/annotation/meta/get`, 'OPTIONS');
            }
            case SupportedPlugins.TF_SEGMENTATION: {
                return isReachable(`${serverHost}/tensorflow/segmentation/meta/get`, 'OPTIONS');
            }
            case SupportedPlugins.DEXTR_SEGMENTATION: {
                return isReachable(`${serverHost}/dextr/enabled`, 'GET');
            }
            case SupportedPlugins.ANALYTICS: {
                return isReachable(`${serverHost}/analytics/app/kibana`, 'GET');
            }
            case SupportedPlugins.REID: {
                return isReachable(`${serverHost}/reid/enabled`, 'GET');
            }
            default:
                return false;
        }
    }
}

export default PluginChecker;
