import getCore from '../core';
import { SupportedPlugins } from '../reducers/interfaces';

const core = getCore();

// Easy plugin checker to understand what plugins supports by a server
class PluginChecker {
    public static async check(plugin: SupportedPlugins): Promise<boolean> {
        const serverHost = core.config.backendAPI.slice(0, -7);

        switch (plugin) {
            case SupportedPlugins.GIT_INTEGRATION: {
                const response = await fetch(`${serverHost}/git/repository/meta/get`);
                if (response.ok) {
                    return true;
                }
                return false;
            }
            case SupportedPlugins.AUTO_ANNOTATION: {
                const response = await fetch(`${serverHost}/auto_annotation/meta/get`);
                if (response.ok) {
                    return true;
                }
                return false;
            }
            case SupportedPlugins.TF_ANNOTATION: {
                const response = await fetch(`${serverHost}/tensorflow/annotation/meta/get`);
                if (response.ok) {
                    return true;
                }
                return false;
            }
            case SupportedPlugins.ANALYTICS: {
                const response = await fetch(`${serverHost}/analytics/app/kibana`);
                if (response.ok) {
                    return true;
                }
                return false;
            }
            default:
                return false;
        }
    }
}

export default PluginChecker;
