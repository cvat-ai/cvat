from argparse import ArgumentParser

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils.module_loading import import_string


class Command(BaseCommand):
    help = "Run a configured periodic job immediately"

    def add_arguments(self, parser: ArgumentParser) -> None:
        parser.add_argument("job_id", help="ID of the job to run")

    def handle(self, *args, **options):
        job_id = options["job_id"]

        for job_definition in settings.PERIODIC_RQ_JOBS:
            if job_definition["id"] == job_id:
                job_func = import_string(job_definition["func"])
                job_func(
                    *(job_definition.get("args", [])),
                    **(job_definition.get("kwargs", {})),
                )
                return

        raise CommandError(f"Job with ID {job_id} not found")
