import logging
import os
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

logger = logging.getLogger('cvat')


def hide_passwd(passwd: str):
    return len(passwd) * '*' if passwd else passwd


def is_valid_email(email):
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError
    try:
        validate_email(email)
        return True
    except ValidationError:
        return False


class Command(BaseCommand):
    help = "Creates an admin user non-interactively if it doesn't exist"

    def add_arguments(self, parser):
        parser.add_argument('--username', help="Admin's username")
        parser.add_argument('--email', help="Admin's email")
        parser.add_argument('--password', help="Admin's password")
        parser.add_argument('--no-input', help="Read options from the environment", action='store_true')

    def handle(self, *args, **options):

        logger.info('%s: handle(args=%s, options=%s)' % (
            __name__, str(args), str({k: v if k != 'password' else hide_passwd(v) for k, v in options.items()})))

        if options['no_input']:
            options['username'] = os.environ['DJANGO_SUPERUSER_USERNAME']
            options['password'] = os.environ['DJANGO_SUPERUSER_PASSWORD']

        if is_valid_email(options['username']):
            logger.info('setting %s as email' % options['username'])
            options['email'] = options['username']

        User = get_user_model()

        if User.objects.filter(username=options['username']).exists():
            logger.info('user already exists: %s' % options['username'])
            u = User.objects.get(username=options['username'])
            logger.info('selected existing user: %s' % str(u))
            if options['password']:
                logger.info('updating password for user %s' % options['username'])
                u.set_password(options['password'])
            if options['email']:
                logger.info('updating email for user %s (%s -> %s)' % (options['username'], u.email, options['email']))
                u.email = options['email']
            logger.info('saving user: %s' % str(u))
            u.save()
            u = User.objects.get(username=options['username'])
            logger.info('user saved: %s' % str(u))
        else:
            logger.info('creating superuser: username=%s, email=%s, password=%s' % (
                options['username'], options['email'] if 'email' in options else str(None), hide_passwd(options['password'])))
            su = User.objects.create_superuser(
                username=options['username'],
                password=options['password'],
                email=options['email'] if 'email' in options else None
            )
            logger.info('superuser created: %s' % str(su))
