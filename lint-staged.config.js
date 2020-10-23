// lint-staged.config.js

const micromatch = require('micromatch');
const path = require('path');

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

    const commands = [];
    if (prettierFiles.length) {
        commands.push(`prettier --write ${prettierFiles.join(' ')}`);
    }

    if (cvatUI.length) {
        commands.push(`npm run precommit:cvat-ui -- ${cvatUI.join(' ')}`);
    }

    if (cvatData.length) {
        commands.push(`npm run precommit:cvat-data -- ${cvatData.join(' ')}`);
    }

    if (cvatCore.length) {
        commands.push(`npm run precommit:cvat-core -- ${cvatCore.join(' ')}`);
    }

    if (cvatCanvas.length) {
        commands.push(`npm run precommit:cvat-canvas -- ${cvatCanvas.join(' ')}`);
    }

    return commands;
};
