ARG ELK_VERSION
FROM docker.elastic.co/logstash/logstash-oss:${ELK_VERSION}
RUN logstash-plugin install logstash-input-http

COPY logstash.conf   /usr/share/logstash/
