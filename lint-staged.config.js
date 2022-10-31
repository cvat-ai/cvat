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
    const eslintFiles = micromatch(stagedFiles, eslintExtensions);
    const scssFiles = micromatch(stagedFiles, scssExtensions);
    const pythonFiles = micromatch(stagedFiles, pythonExtensions);

    const uiTests = containsInPath('/tests/cypress', eslintFiles);
    const cvatData = containsInPath('/cvat-data/', eslintFiles);
    const cvatCore = containsInPath('/cvat-core/src', eslintFiles);
    const cvatCanvas = containsInPath('/cvat-canvas/', eslintFiles);
    const cvatCanvas3d = containsInPath('/cvat-canvas3d/', eslintFiles);
    const cvatUI = containsInPath('/cvat-ui/', eslintFiles);
    const cvatSdk = containsInPath('/cvat-sdk', pythonFiles);
    const cvatCli = containsInPath('/cvat-cli', pythonFiles);
    const pythonTests = containsInPath('/tests/python', pythonFiles);

    const tasks = []; // [command, file list] pairs
    tasks.push(['npx stylelint --fix ', scssFiles.join(' ')]);
    tasks.push(['yarn run precommit:cvat-tests -- ', uiTests.join(' ')]);
    tasks.push(['yarn run precommit:cvat-ui -- ', cvatUI.join(' ')]);
    tasks.push(['yarn run precommit:cvat-data -- ', cvatData.join(' ')]);
    tasks.push(['yarn run precommit:cvat-core -- ', cvatCore.join(' ')]);
    tasks.push(['yarn run precommit:cvat-canvas -- ', cvatCanvas.join(' ')]);
    tasks.push(['yarn run precommit:cvat-canvas3d -- ', cvatCanvas3d.join(' ')]);

    // If different components use different Black/isort configs,
    // we need to run Black/isort for each python component group separately.
    // Otherwise, they all will use the same config. This will mess up
    // the current package detection for different modules, leading
    // to incorrect formatting of module imports.
    tasks.push(['black', cvatSdk.join(' ')]);
    tasks.push(['black', cvatCli.join(' ')]);
    tasks.push(['black', pythonTests.join(' ')]);
    tasks.push(['isort', cvatSdk.join(' ')]);
    tasks.push(['isort', cvatCli.join(' ')]);
    tasks.push(['isort', pythonTests.join(' ')]);
    tasks.push(['pylint', pythonFiles.join(' ')]);

    const commands = [];
    for (const [command, files] of tasks) {
        if (files.length) {
            commands.push(`${command} ${files}`);
        }
    }

    return commands;
};
