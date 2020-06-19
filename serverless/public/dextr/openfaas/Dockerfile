FROM openfaas/classic-watchdog:0.18.1 as watchdog

FROM openvino/ubuntu18_runtime:2020.1

USER root

COPY --from=watchdog /fwatchdog /usr/bin/fwatchdog
RUN chmod +x /usr/bin/fwatchdog
WORKDIR /home/openvino
RUN apt update && apt install -y python3-dev libpython3.6

USER openvino
COPY dextr.* *.py *.sh requirements.txt /home/openvino/
RUN pip3 install --user -r requirements.txt

# Populate example here - i.e. "cat", "sha512sum" or "node index.js"
ENV fprocess="bash index.sh"
# Set to true to see request in function logs
ENV write_debug="true"

EXPOSE 8080

HEALTHCHECK --interval=3s CMD [ -e /tmp/.lock ] || exit 1

CMD ["fwatchdog"]
