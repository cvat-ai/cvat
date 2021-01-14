import os
from django.conf import settings
from sendfile import sendfile

def OpenCVLibrary(request):
    path = os.path.realpath(os.path.join(settings.STATIC_ROOT, 'opencv', 'js', 'opencv.js'))
    return sendfile(request, path)
