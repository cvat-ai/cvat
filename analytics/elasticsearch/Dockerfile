ARG ELK_VERSION
FROM docker.elastic.co/elasticsearch/elasticsearch-oss:${ELK_VERSION}
COPY --chown=elasticsearch:elasticsearch elasticsearch.yml sg_config.yml /usr/share/elasticsearch/config/
COPY --chown=elasticsearch:elasticsearch search-guard-6-6.4.0-23.1.zip /tmp/
COPY --chown=elasticsearch:elasticsearch chain-ca.pem root-ca.pem truststore.jks  truststore.p12 CN=elasticsearch* /usr/share/elasticsearch/config/

RUN bin/elasticsearch-plugin install --batch file:///tmp/search-guard-6-6.4.0-23.1.zip
