module.exports = function setup(api) {
    api.cache(true);

    const plugins = [];
    const presets = [
        ['@babel/preset-env', {
            targets: {
                chrome: 58,
            },
            useBuiltIns: 'usage',
            loose: false,
            spec: false,
            debug: false,
            include: [],
            exclude: [],
        }],
    ];

    return {
        presets,
        plugins,
    };
};
