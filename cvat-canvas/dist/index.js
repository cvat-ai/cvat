window.addEventListener('DOMContentLoaded', async () => {
    await window.cvat.server.login('admin', 'nimda760');
    const [job] = (await window.cvat.jobs.get({ jobID: 21 }));
    const canvas = new window.canvas.Canvas();
    const htmlContainer = window.document.getElementById('htmlContainer');


    htmlContainer.appendChild(canvas.html());

    let frame = 0;
    const callback = async () => {
        canvas.fit();
        const frameData = await job.frames.get(frame);
        canvas.setup(frameData, []);
        frame += 1;

        if (frame > 50) {
            frame = 0;
        }
    };

    canvas.html().addEventListener('canvas.setup', async () => {
        setTimeout(callback, 30);
    });

    const frameData = await job.frames.get(frame);
    canvas.setup(frameData, []);
});
