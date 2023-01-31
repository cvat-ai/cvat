ARG ELK_VERSION=6.8.23
FROM docker.elastic.co/logstash/logstash-oss:${ELK_VERSION}
RUN logstash-plugin install logstash-input-http logstash-output-amazon_es \
    logstash-filter-aggregate logstash-filter-prune logstash-output-email

COPY logstash.yml  /usr/share/logstash/config/
COPY logstash.conf /usr/share/logstash/pipeline/
EXPOSE 8080
