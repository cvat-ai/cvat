ARG ELK_VERSION
FROM docker.elastic.co/logstash/logstash-oss:${ELK_VERSION}
RUN logstash-plugin install logstash-input-http logstash-filter-aggregate \
    logstash-filter-prune logstash-output-email

COPY logstash.yml  /usr/share/logstash/config/
COPY logstash.conf /usr/share/logstash/pipeline/
EXPOSE 8080
