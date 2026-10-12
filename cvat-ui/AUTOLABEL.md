# AutoLabel panel in CVAT

`docker-compose.yml` builds `Dockerfile.autolabel-ui` on top of the existing `cvat/ui` image. Nginx injects
`autolabel-panel.js` into CVAT's HTML. The script adds **AutoLabel video** to the annotation-page toolbar. Browser
requests use the same-origin `/autolabel/` route provided by `P-116/docker-compose.internal.yml`, forwarding the
CVAT session cookie and CSRF header. The service PAT stays in P-116. P-116 verifies the user's CVAT job permissions;
the CVAT server must be rebuilt to expose `/api/jobs/{id}/autolabel-permission`.

Start CVAT and the P-116 internal Compose overlay, then open a 2D job that starts at frame 0. The panel imports that job's frames, saves and captures
manual frame-0 boxes, runs AI labeling, displays the review queue, and adds pending tracks to the same CVAT job. The
importer accepts a continuous, unfiltered CVAT job and selects at most 300 model frames with either motion budget or
threshold sampling. It does not recover original video timestamps from CVAT; imported frames use one-second placeholder timestamps. Refresh the CVAT page after rebuilding
the UI image so the browser loads the updated script.
