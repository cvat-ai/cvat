import os
import glob
from django.conf import settings
from django_sendfile import sendfile

def OpenCVLibrary(request):
    dirname = os.path.join(settings.STATIC_ROOT, 'opencv', 'js')
    pattern = os.path.join(dirname, 'opencv_*.js')
    path = glob.glob(pattern)[0]
    response = sendfile(request, path)
    response['Cache-Control'] = "public, max-age=604800"
    return response
