/* exported setupAPI */

function setupAPI(collectionModel, job) {
    window.cvat = {};
    let space = window.cvat;

    space.tracks = {
        get: collectionModel.exportTracks.bind(collectionModel),
        set: (data) => {
            collectionModel.importTracks(data);
            collectionModel.update();
        },
        clear: collectionModel.removeTracks.bind(collectionModel),
    };

    space.job = {
        id: job.jobid,
        mode: job.mode,
        start: job.start,
        stop: job.stop
    };
}
