import getCore from '../core';
import { SupportedPlugins } from '../reducers/interfaces';

const core = getCore();

// Easy plugin checker to understand what plugins supports by a server
class PluginChecker {
    public static async check(plugin: SupportedPlugins): Promise<boolean> {
        const serverHost = core.config.backendAPI.slice(0, -7);
        const isReachable = async (url: string): Promise<boolean> => {
            try {
                await core.server.request(url);
                return true;
            } catch (error) {
                if (error.code === 404) {
                    return false;
                }

                throw error;
            }
        };

        switch (plugin) {
            case SupportedPlugins.GIT_INTEGRATION: {
                return isReachable(`${serverHost}/git/repository/meta/get`);
            }
            case SupportedPlugins.AUTO_ANNOTATION: {
                return isReachable(`${serverHost}/auto_annotation/meta/get`);
            }
            case SupportedPlugins.TF_ANNOTATION: {
                return isReachable(`${serverHost}/tensorflow/annotation/meta/get`);
            }
            case SupportedPlugins.TF_SEGMENTATION: {
                return isReachable(`${serverHost}/tensorflow/segmentation/meta/get`);
            }
            case SupportedPlugins.ANALYTICS: {
                return isReachable(`${serverHost}/analytics/app/kibana`);
            }
            default:
                return false;
        }
    }
}

export default PluginChecker;
