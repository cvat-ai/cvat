import _cvat from '../../cvat-core/src/api';

const cvat: any = _cvat;

const protocol = typeof (process.env.REACT_APP_API_PROTOCOL) === 'undefined'
    ? 'http' : process.env.REACT_APP_API_PROTOCOL;
const host = typeof (process.env.REACT_APP_API_HOST) === 'undefined'
    ? 'localhost' : process.env.REACT_APP_API_HOST;
const port = typeof (process.env.REACT_APP_API_PORT) === 'undefined'
    ? '7000' : process.env.REACT_APP_API_PORT;

cvat.config.backendAPI = `${protocol}://${host}:${port}/api/v1`;

export default function getCore(): any {
    return cvat;
}
