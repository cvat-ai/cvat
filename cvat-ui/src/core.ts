import _cvat from '../../cvat-core/dist/cvat-core.node';

const cvat: any = _cvat;

cvat.config.backendAPI = 'http://localhost:7000/api/v1';

export default function getCore(): any {
    return cvat;
}
