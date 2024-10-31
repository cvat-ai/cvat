import logging
import os
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

logger = logging.getLogger('cvat')

def hide_passwd(passwd: str):
    return len(passwd)*'*' if passwd else passwd

class Command(BaseCommand):
  help = "Creates an admin user non-interactively if it doesn't exist"

  def add_arguments(self, parser):
    parser.add_argument('--username', help="Admin's username")
    parser.add_argument('--email', help="Admin's email")
    parser.add_argument('--password', help="Admin's password")
    parser.add_argument('--no-input', help="Read options from the environment", action='store_true')

  def handle(self, *args, **options):

    logger.debug('%s: handle(args=%s, options=%s)' % (__name__, str(args), str({k:v if k != 'password' else hide_passwd(v) for k,v in options.items()})))

    if options['no_input']:
      options['username'] = os.environ['DJANGO_SUPERUSER_USERNAME']
      options['email'] = os.environ['DJANGO_SUPERUSER_EMAIL']
      options['password'] = os.environ['DJANGO_SUPERUSER_PASSWORD']

    User = get_user_model()

    if User.objects.filter(username=options['username']).exists():
        logger.debug('user already exists: %s' % options['username'])
        u = User.objects.get(username=options['username'])
        logger.debug('selected existing user: %s' % str(u))
        if options['password']:
            logger.debug('updating password for user %s' % options['username'])
            u.set_password(options['password'])
        if options['email']:
            logger.debug('updating email for user %s (%s -> %s)' % (options['username'], u.email, options['email']))
            u.email = options['email']
        logger.debug('saving user: %s' % str(u))
        u.save()
        u = User.objects.get(username=options['username'])
        logger.debug('user saved: %s' % str(u))
    else:
      logger.debug('creating superuser: username=%s, email=%s, password=%s' % (options['username']))
      su = User.objects.create_superuser(
        username=options['username'],
        email=options['email'],
        password=options['password']
      )
      logger.debug('superuser created: %s' % str(su))
