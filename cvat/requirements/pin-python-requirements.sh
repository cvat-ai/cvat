export CUSTOM_COMPILE_COMMAND=./pin-pip-dependencies.sh
pip-compile base.in --output-file=base.txt
pip-compile production.in --output-file=production.txt
pip-compile development.in --output-file=development.txt
pip-compile testing.in --output-file=testing.txt
pip-compile staging.in --output-file=staging.txt
