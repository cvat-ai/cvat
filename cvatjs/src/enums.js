(() => {
    const ShareFileType = Object.freeze({
        DIR: 'DIR',
        REG: 'REG',
    });

    const TaskStatus = Object.freeze({
        ANNOTATION: 'annotation',
        VALIDATION: 'validation',
        COMPLETED: 'completed',
    });

    const TaskMode = Object.freeze({
        ANNOTATION: 'annotation',
        INTERPOLATION: 'interpolation',
    });

    module.exports = {
        ShareFileType,
        TaskStatus,
        TaskMode,
    };
})();
