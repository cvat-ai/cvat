import os
from django.http import HttpResponseRedirect
from django.templatetags.static import static


OPENCV_JS_LIBRARY_NAME='opencv_4.5.4_dev.js'


def OpenCVLibrary(request):
    opencv_path = os.path.join('opencv', 'js', OPENCV_JS_LIBRARY_NAME)
    return HttpResponseRedirect(static(opencv_path))
