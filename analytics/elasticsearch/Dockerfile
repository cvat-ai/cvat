ARG ELK_VERSION
FROM docker.elastic.co/elasticsearch/elasticsearch-oss:${ELK_VERSION}
COPY --chown=elasticsearch:elasticsearch elasticsearch.yml readonlyrest.yml /usr/share/elasticsearch/config/
COPY --chown=elasticsearch:elasticsearch readonlyrest-*.zip /tmp/

RUN bin/elasticsearch-plugin install --batch file:///tmp/readonlyrest-1.16.27_es6.4.0.zip
USER elasticsearch
