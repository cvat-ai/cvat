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
    const pythonExtensions = ['py'].map(makePattern);
    const mdExtensions = ['md'].map(makePattern);
    const eslintFiles = micromatch(stagedFiles, eslintExtensions);
    const scssFiles = micromatch(stagedFiles, scssExtensions);
    const pythonFiles = micromatch(stagedFiles, pythonExtensions);
    const mdFiles = micromatch(stagedFiles, mdExtensions);

    const uiTests = containsInPath('/tests/cypress/', eslintFiles);
    const cvatData = containsInPath('/cvat-data/', eslintFiles);
    const cvatCore = containsInPath('/cvat-core/src/', eslintFiles);
    const cvatCanvas = containsInPath('/cvat-canvas/', eslintFiles);
    const cvatCanvas3d = containsInPath('/cvat-canvas3d/', eslintFiles);
    const cvatUI = containsInPath('/cvat-ui/', eslintFiles);
    const cvatSdk = containsInPath('/cvat-sdk/', pythonFiles);
    const cvatCli = containsInPath('/cvat-cli/', pythonFiles);
    const pythonTests = containsInPath('/tests/python/', pythonFiles);

    // [command, file list] pairs
    // Note that some tools can be missing on the target machine. It is not
    // expected for js-related/-based tools, because they are installed together with
    // lint-staged.
    const tasks = [
        ['yarn run stylelint --fix', scssFiles],
        ['yarn run precommit:cvat-tests', uiTests],
        ['yarn run precommit:cvat-ui', cvatUI],
        ['yarn run precommit:cvat-data', cvatData],
        ['yarn run precommit:cvat-core', cvatCore],
        ['yarn run precommit:cvat-canvas', cvatCanvas],
        ['yarn run precommit:cvat-canvas3d', cvatCanvas3d],

        // If different components use different Black/isort configs,
        // we need to run Black/isort for each python component group separately.
        // Otherwise, they all will use the same config. This will mess up
        // the current package detection for different modules, leading
        // to incorrect formatting of module imports.
        ['yarn run precommit:black', cvatSdk],
        ['yarn run precommit:black', cvatCli],
        ['yarn run precommit:black', pythonTests],
        ['yarn run precommit:isort', cvatSdk],
        ['yarn run precommit:isort', cvatCli],
        ['yarn run precommit:isort', pythonTests],
        ['yarn run precommit:pylint', pythonFiles],

        ['yarn run remark -q -f --no-stdout --silently-ignore ', mdFiles],
    ];

    const commands = [];
    for (const [command, files] of tasks) {
        if (files.length) {
            commands.push(`${command} ${files.join(' ')}`);
        }
    }

    return commands;
};
