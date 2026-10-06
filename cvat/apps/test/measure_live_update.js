// SPDX-License-Identifier: MIT
//
// Times the live update (MO-2 in docs/objectives.md): from saving one box until the
// counts that include it have arrived, doing what the page does - wait for the
// WebSocket "changed" message, then reload the counts. Each box is deleted afterwards.
//
// Usage (Node 18+, the `ws` package from the repository's node_modules):
//   CVAT_USER=<user> CVAT_PASSWORD=<password> NODE_PATH=node_modules \
//       node cvat/apps/test/measure_live_update.js <task_id> [runs]

const WebSocket = require('ws');

const HOST = process.env.CVAT_URL || 'http://localhost:8080';
const taskId = Number(process.argv[2]);
const runs = Number(process.argv[3] || 5);

async function main() {
    const login = await fetch(`${HOST}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: process.env.CVAT_USER, password: process.env.CVAT_PASSWORD }),
    });
    const cookies = login.headers.getSetCookie().map((cookie) => cookie.split(';')[0]);
    const csrfToken = cookies.find((cookie) => cookie.startsWith('csrftoken=')).split('=')[1];
    const headers = { Cookie: cookies.join('; '), 'X-CSRFToken': csrfToken, 'Content-Type': 'application/json' };
    const api = async (path, options = {}) => (await fetch(`${HOST}/api${path}`, { headers, ...options })).json();

    const socket = new WebSocket(
        `${HOST.replace(/^http/, 'ws')}/api/test/tasks/${taskId}/annotation-counts/ws?org=`,
        { headers: { Cookie: headers.Cookie } },
    );
    await new Promise((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('unexpected-response', (request, response) => reject(new Error(`refused: ${response.statusCode}`)));
    });
    const nextChange = () => new Promise((resolve) => socket.once('message', resolve));

    const jobId = (await api(`/jobs?task_id=${taskId}`)).results[0].id;
    const labelId = (await api(`/labels?task_id=${taskId}`)).results[0].id;
    const countBefore = (await api(`/test/tasks/${taskId}/annotation-counts`)).total;

    const measureOnce = async () => {
        const changed = nextChange();
        const start = performance.now();
        const created = await api(`/jobs/${jobId}/annotations?action=create`, {
            method: 'PATCH',
            body: JSON.stringify({
                version: 0,
                tags: [],
                tracks: [],
                shapes: [{
                    type: 'rectangle', frame: 0, label_id: labelId, points: [10, 10, 50, 50],
                    occluded: false, z_order: 0, attributes: [], group: 0, source: 'manual',
                }],
            }),
        });
        await changed;
        const counts = await api(`/test/tasks/${taskId}/annotation-counts`);
        const elapsed = performance.now() - start;
        if (counts.total !== countBefore + 1) {
            throw new Error(`expected ${countBefore + 1} annotations, got ${counts.total}`);
        }

        const deleted = nextChange();
        await api(`/jobs/${jobId}/annotations?action=delete`, {
            method: 'PATCH',
            body: JSON.stringify({ version: 0, tags: [], tracks: [], shapes: created.shapes }),
        });
        await deleted;
        return elapsed;
    };

    console.log(`Measured at ${new Date().toISOString()}, task ${taskId}, ${runs} runs`);
    await measureOnce(); // warm-up, not counted
    const times = [];
    for (let run = 1; run <= runs; run++) {
        times.push(await measureOnce());
        console.log(`  run ${run}: ${times[times.length - 1].toFixed(1)} ms`);
    }

    const sorted = [...times].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    console.log(`  median ${median.toFixed(1)} ms, spread ${(sorted[sorted.length - 1] - sorted[0]).toFixed(1)} ms ` +
        `(fastest ${sorted[0].toFixed(1)} ms, slowest ${sorted[sorted.length - 1].toFixed(1)} ms)`);
    socket.close();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
