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
    const scssExtensions = ['scss'].map(makePattern);
    const eslintFiles = micromatch(stagedFiles, eslintExtensions);
    const scssFiles = micromatch(stagedFiles, scssExtensions);

    const tests = containsInPath('/tests/cypress', eslintFiles);
    const cvatData = containsInPath('/cvat-data/', eslintFiles);
    const cvatCore = containsInPath('/cvat-core/src', eslintFiles);
    const cvatCanvas = containsInPath('/cvat-canvas/', eslintFiles);
    const cvatCanvas3d = containsInPath('/cvat-canvas3d/', eslintFiles);
    const cvatUI = containsInPath('/cvat-ui/', eslintFiles);

    const mapping = {};
    const commands = [];
    mapping['npx stylelint --fix '] = scssFiles.join(' ');
    mapping['yarn run precommit:cvat-tests '] = tests.join(' ');
    mapping['yarn run precommit:cvat-ui '] = cvatUI.join(' ');
    mapping['yarn run precommit:cvat-data '] = cvatData.join(' ');
    mapping['yarn run precommit:cvat-core '] = cvatCore.join(' ');
    mapping['yarn run precommit:cvat-canvas '] = cvatCanvas.join(' ');
    mapping['yarn run precommit:cvat-canvas3d '] = cvatCanvas3d.join(' ');

    for (const command of Object.keys(mapping)) {
        const files = mapping[command];
        if (files.length) {
            commands.push(`${command} ${files}`);
        }
    }

    return commands;
};
