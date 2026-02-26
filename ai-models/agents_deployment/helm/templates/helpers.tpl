{{/*
Fully qualified app name (truncated to 63 chars).
*/}}
{{- define "agent.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "agent.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "agent.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Job selector labels
*/}}
{{- define "agent.jobSelectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: job
{{- end }}

{{/*
Common environment variables
*/}}
{{- define "agent.commonEnv" -}}
- name: CVAT_BASE_URL
  value: {{ .Values.agent.cvat_base_url | default "https://app.cvat.ai" | quote }}
{{- if .Values.agent.cvat_access_token }}
- name: CVAT_ACCESS_TOKEN
  value: {{ .Values.agent.cvat_access_token | quote }}
{{- end }}
{{- if not .Values.agent.cvat_access_token }}
{{- range .Values.agent.secret_env }}
- name: {{ .name }}
  valueFrom:
    secretKeyRef:
      name: {{ .secretName }}
      key: {{ .secretKey }}
{{- end }}
{{- end }}
- name: MODEL_ID
  value: {{ .Values.agent.model_id | quote }}
- name: NAMESPACE
  value: {{ .Release.Namespace }}
- name: CONFIGMAP_NAME
  value: {{ include "agent.fullname" . }}-config
- name: ORG_SLUG
  value: {{ .Values.agent.org_slug | quote }}
{{- end }}

{{/*
Common image/imagePullPolicy
*/}}

{{- define "agent.image" -}}
image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
imagePullPolicy: {{ .Values.image.pullPolicy }}
{{- end }}

{{- define "agent.podSecurityContext" -}}
runAsNonRoot: true
runAsUser: 1000
runAsGroup: 1000
{{- end }}
