import _cvat from '../../cvat-core/src/api';

const cvat: any = _cvat;

const protocol = 'REACT_APP_API_PROTOCOL' in process.env
    ? process.env.REACT_APP_API_PROTOCOL : 'http';
const host = 'REACT_APP_API_HOST' in process.env
    ? process.env.REACT_APP_API_HOST : 'localhost';
const port = 'REACT_APP_API_PORT' in process.env
    ? process.env.REACT_APP_API_PORT : '7000';

cvat.config.backendAPI = `${protocol}://${host}:${port}/api/v1`;

export default function getCore(): any {
    return cvat;
}
