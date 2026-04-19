{{- define "test-chart.minioSecretName" -}}
{{ printf "%s-minio" .Release.Name }}
{{- end -}}

{{- define "test-chart.minioServiceName" -}}
{{ tpl (.Values.minio.serviceName) . }}
{{- end -}}

{{- define "test-chart.allowMinioConfigMapName" -}}
{{ printf "%s-allow-minio" .Release.Name }}
{{- end -}}

{{- define "test-chart.webhookReceiverConfigMapName" -}}
{{ printf "%s-webhook-receiver" .Release.Name }}
{{- end -}}

{{- define "test-chart.webhookReceiverServiceName" -}}
{{ tpl (.Values.webhookReceiver.serviceName) . }}
{{- end -}}

{{- define "test-chart.allowWebhookReceiverConfigMapName" -}}
{{ printf "%s-allow-webhook-receiver" .Release.Name }}
{{- end -}}
