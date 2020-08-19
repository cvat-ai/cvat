import dextrConfig from './openvino.dextr';

const configMap = {
    'openvino.dextr': dextrConfig,
};

export default function receiveConfig(modelId: string): object {
    if (modelId in configMap) {
        return (configMap as any)[modelId];
    }

    throw new Error(`Unknown model ID. Please put config for "${modelId}" and rebuild the client`);
}
