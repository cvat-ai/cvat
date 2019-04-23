(() => {
    /**
        * Enum for type of server files
        * @enum {string}
        * @name ShareFileType
        * @memberof module:API.cvat.enums
        */
    const ShareFileType = Object.freeze({
        DIR: 'DIR',
        REG: 'REG',
    });

    /**
        * Enum for a status of a task
        * @enum {string}
        * @name TaskStatus
        * @memberof module:API.cvat.enums
    */
    const TaskStatus = Object.freeze({
        ANNOTATION: 'annotation',
        VALIDATION: 'validation',
        COMPLETED: 'completed',
    });

    /**
        * Enum for a mode of a task
        * @enum {string}
        * @name TaskMode
        * @memberof module:API.cvat.enums
    */
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
