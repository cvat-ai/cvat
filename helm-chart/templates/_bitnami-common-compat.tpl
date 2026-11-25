{{/*
Fix for Bitnami template that was used in Clickhouse and was overriding Bitnami postgres template,
postgres and redis share Bitnami common library. PostgreSQL 12.1.x calls this helper with the chart context,
while Redis 19.6.x passes a dictionary containing context and customLabels.
*/}}
{{- define "common.labels.standard" -}}
{{- $context := . -}}
{{- $customLabels := dict -}}
{{- if and (hasKey . "context") (hasKey . "customLabels") -}}
  {{- $context = .context -}}
  {{- $customLabels = default (dict) .customLabels -}}
{{- end -}}

{{- $standardLabels := dict
  "app.kubernetes.io/name" (include "common.names.name" $context)
  "helm.sh/chart" (include "common.names.chart" $context)
  "app.kubernetes.io/instance" $context.Release.Name
  "app.kubernetes.io/managed-by" $context.Release.Service
-}}
{{- with $context.Chart.AppVersion -}}
  {{- $_ := set $standardLabels "app.kubernetes.io/version" . -}}
{{- end -}}

{{- $renderedCustomLabels := dict -}}
{{- with $customLabels -}}
  {{- $renderedCustomLabels = include "common.tplvalues.render" (dict "value" . "context" $context) | fromYaml -}}
{{- end -}}
{{- merge $renderedCustomLabels $standardLabels | toYaml -}}
{{- end -}}

{{/*
Selector-label counterpart of common.labels.standard. Only the stable name and
instance labels are allowed through from custom pod labels.
*/}}
{{- define "common.labels.matchLabels" -}}
{{- $context := . -}}
{{- $customLabels := dict -}}
{{- if and (hasKey . "context") (hasKey . "customLabels") -}}
  {{- $context = .context -}}
  {{- $customLabels = default (dict) .customLabels -}}
{{- end -}}

{{- $matchLabels := dict
  "app.kubernetes.io/name" (include "common.names.name" $context)
  "app.kubernetes.io/instance" $context.Release.Name
-}}
{{- $renderedCustomLabels := dict -}}
{{- with $customLabels -}}
  {{- $renderedCustomLabels = include "common.tplvalues.render" (dict "value" . "context" $context) | fromYaml -}}
{{- end -}}
{{- merge (pick $renderedCustomLabels "app.kubernetes.io/name" "app.kubernetes.io/instance") $matchLabels | toYaml -}}
{{- end -}}
