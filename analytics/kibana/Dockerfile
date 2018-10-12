ARG ELK_VERSION
FROM docker.elastic.co/kibana/kibana-oss:${ELK_VERSION}
COPY kibana.yml /usr/share/kibana/config/
COPY --chown=kibana:kibana search-guard-kibana-plugin-6.4.0-15.zip /tmp/

RUN bin/kibana-plugin install file:///tmp/search-guard-kibana-plugin-6.4.0-15.zip


