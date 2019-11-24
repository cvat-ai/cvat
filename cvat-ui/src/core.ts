import _cvat from '../../cvat-core/src/api';

const cvat: any = _cvat;

const protocol = process.env.REACT_APP_API_PROTOCOL;
const host = process.env.REACT_APP_API_HOST;
const port = process.env.REACT_APP_API_PORT;

cvat.config.backendAPI = `${protocol}://${host}:${port}/api/v1`;

export default function getCore(): any {
    return cvat;
}
