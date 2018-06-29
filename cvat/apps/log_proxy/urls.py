from django.urls import path
from . import views

urlpatterns = [
    path('exception/<int:jid>', views.exception_receiver),
]
