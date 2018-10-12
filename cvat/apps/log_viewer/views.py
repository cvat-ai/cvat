import os
from revproxy.views import ProxyView
from cvat.apps.authentication.decorators import login_required
from django.utils.decorators import method_decorator

@method_decorator(login_required, name='dispatch')
class LogViewerProxy(ProxyView):
    upstream = 'http://{}:{}'.format(os.getenv('DJANGO_LOG_VIEWER_HOST'),
        os.getenv('DJANGO_LOG_VIEWER_PORT'))
    add_remote_user = True

    def get_request_headers(self):
        headers = super().get_request_headers()
        headers['X-Forwarded-User'] = headers['REMOTE_USER']

        return headers
