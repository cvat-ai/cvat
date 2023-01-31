#!/usr/bin/env python3
import json
import os

import click

FAKE = False

APP_CVAT = 'retechlabs/rebotics-cvat'
APP_OPA = 'retechlabs/rebotics-cvat-opa'
APP_LOGSTASH = 'retechlabs/rebotics-cvat-logstsah'
APP_CHOICES = (APP_CVAT, APP_OPA, APP_LOGSTASH)

ECR_NAME_MAP = {
    APP_CVAT: 'cvat',
    APP_OPA: 'opa',
    APP_LOGSTASH: 'logstash',
}

NOTIFY_YES = 'yes'
NOTIFY_NO = 'no'
NOTIFY_ONLY = 'only'
NOTIFY_CHOICES = (NOTIFY_YES, NOTIFY_NO, NOTIFY_ONLY)

ECS_NOTIFICATION_PREFIX = {
    APP_CVAT: '',
    APP_OPA: 'opa_',
    APP_LOGSTASH: 'logstash_'
}


def sys_call(command):
    click.echo(f"{os.getcwd()}$ {command}")
    if not FAKE:
        if os.system(command) != 0:  # nosec
            raise click.ClickException("Failed to run")


@click.group()
@click.option('--fake', is_flag=True)
def main(fake=FAKE):
    global FAKE
    FAKE = fake


@main.command(name='minor')
@click.argument('version_file', type=click.File(mode='r'))
def get_minor(version_file):
    version = version_file.read()
    major, minor, patch = version.split('.')
    click.echo('{major}.{minor}'.format(**locals()))


@main.command(name='version')
@click.argument('version_file', type=click.File(mode='r'))
def get_version(version_file):
    click.echo(version_file.read())


def _login_to_ecr(
        ecr_template: str,
        profile: str,
        region: str
):
    click.echo("Logging in to ECR...")
    ecr_endpoint = ecr_template.split('/')[0]
    sys_call(f"aws ecr get-login-password --region {region} --profile {profile} "
             f"| docker login --username AWS --password-stdin {ecr_endpoint}")
    click.echo("-" * 100)


def _deploy_app(environment, application, version, ecr_template, s3_template, s3_profile, notify_ecs):
    ecs_notification = dict()

    for app in application.split(','):
        ecr_name = ECR_NAME_MAP[app]
        ecr_repo = ecr_template.format(
            app_name=ecr_name,
            environment=environment,
        )

        if notify_ecs in (NOTIFY_YES, NOTIFY_NO):
            click.echo(f"Sending {app}:{version} to ECR")
            sys_call(f"docker tag {app}:{version} {ecr_repo}:{version}")
            sys_call(f"docker push {ecr_repo}:{version}")
        else:
            click.echo('Only notification mode, no images uploaded!')

        prefix = ECS_NOTIFICATION_PREFIX[app]
        ecs_notification.update({
            prefix + "tag": version,
            prefix + "image": f"{ecr_repo}:{version}",
            prefix + "repo": ecr_repo,
        })

    if notify_ecs in (NOTIFY_YES, NOTIFY_ONLY):
        click.echo('Sending notification to ECS...')

        with open('ecs_notification.image.json', 'w') as notif_file:
            notif_file.write(json.dumps(ecs_notification))

        try:
            sys_call("zip ecs_notification.zip ecs_notification.image.json")
            s3_notification_key = s3_template.format(
                app_name=ECR_NAME_MAP[APP_CVAT],
                environment=environment,
            )
            sys_call(f"aws --profile {s3_profile} s3 cp ecs_notification.zip {s3_notification_key}")
        finally:
            click.echo("Cleaning...")
            sys_call(f"rm ecs_notification.image.json")
            sys_call(f"rm ecs_notification.zip")
    else:
        click.echo('ECS notification disabled, no notification will be sent.')


@main.command()
@click.option('--application', required=True)
@click.option('--version', default='latest')
@click.option('--environment', default="r3dev")
@click.option('--aws-region', default='us-west-2')
@click.option('--ecr-profile', default='ecr_aws_profile')
@click.option('--s3-profile', default='s3_aws_profile')
@click.option('--ecr-template', default="ecr/{environment}/{app_name}")
@click.option('--s3-template', default="s3://s3-template-{environment}-{retailer}-{app_name}")
@click.option("--notify-ecs", type=click.Choice(NOTIFY_CHOICES), default=NOTIFY_YES)
def deploy_app(version, environment, application,
               ecr_profile, s3_profile,
               ecr_template, s3_template,
               aws_region, notify_ecs):
    _login_to_ecr(
        ecr_template=ecr_template,
        profile=ecr_profile,
        region=aws_region
    )

    _deploy_app(environment=environment,
                application=application,
                version=version,
                ecr_template=ecr_template,
                s3_template=s3_template,
                s3_profile=s3_profile,
                notify_ecs=notify_ecs)
    click.echo("Done!")


if __name__ == '__main__':
    main()
