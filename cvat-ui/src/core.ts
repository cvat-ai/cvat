import _cvat from '../../cvat-core/src/api';

const cvat: any = _cvat;

const protocol = process.env.REACT_APP_API_PROTOCOL || 'http';
const host = process.env.REACT_APP_API_HOST || 'localhost';
const port = process.env.REACT_APP_API_PORT || '7000';

cvat.config.backendAPI = `${protocol}://${host}:${port}/api/v1`;

export default function getCore(): any {
    return cvat;
}
