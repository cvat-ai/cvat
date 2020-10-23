// lint-staged.config.js

const micromatch = require('micromatch');

function containsInPath(pattern, list) {
    return list.filter((item) => micromatch.contains(item, pattern));
}

function makePattern(extension) {
    return `**/*.${extension}`;
}

module.exports = (stagedFiles) => {
    const eslintExtensions = ['ts', 'tsx', 'js'].map(makePattern);
    const prettierExtensions = ['html', 'css', 'scss', 'json', 'yaml', 'yml', 'md']
        .map(makePattern)
        .concat(eslintExtensions);

    const prettierFiles = micromatch(stagedFiles, prettierExtensions);
    const eslintFiles = micromatch(stagedFiles, eslintExtensions);

    const cvatData = containsInPath('/cvat-data/', eslintFiles);
    const cvatCore = containsInPath('/cvat-core/', eslintFiles);
    const cvatCanvas = containsInPath('/cvat-canvas/', eslintFiles);
    const cvatUI = containsInPath('/cvat-ui/', eslintFiles);

    const mapping = {};
    const commands = [];
    mapping['prettier --write '] = prettierFiles.join(' ');
    mapping['npm run precommit:cvat-ui -- '] = cvatUI.join(' ');
    mapping['npm run precommit:cvat-data -- '] = cvatData.join(' ');
    mapping['npm run precommit:cvat-core -- '] = cvatCore.join(' ');
    mapping['npm run precommit:cvat-canvas -- '] = cvatCanvas.join(' ');

    for (const command of Object.keys(mapping)) {
        const files = mapping[command];
        if (files.length) {
            commands.push(`${command} ${files}`);
        }
    }

    return commands;
};
