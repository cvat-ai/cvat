#!/usr/bin/env bash

env `cat rebotics/.env.local.dev` venv/bin/python manage.py $@
