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
{{- else }}
{{- range .Values.agent.secret_env }}
- name: {{ .name }}
  valueFrom:
    secretKeyRef:
      name: {{ .secretName }}
      key: {{ .secretKey }}
{{- end }}
{{- end }}
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


{{/*
Configure command arguments for cvat-cli
*/}}
{{/*I have to use extra var here $val because i need to trim leading space that is generated in range loop and i cannot just pass range output into trim */}}
{{- define "agent.modelParamsOverride" -}}
{{- $preset := index .Values.agent.modelPresets .Values.agent.preset | default dict -}}
{{- $merged := merge .Values.agent.modelParamsOverride $preset -}}
{{- $val := "" -}}
{{- range $key, $v := $merged -}}
{{- if $v.value -}}
{{- $val = printf "%s -p %s=%s:%s" $val $key $v.type $v.value -}}
{{- end -}}
{{- end -}}
- name: MODEL_CONFIG_PARAMS
  value: {{ $val | trim | quote }}
{{- end -}}

{{/*
Configure function name for agent
*/}}
{{- define "agent.functionNameEnv" -}}
- name: FUNCTION_NAME
{{- if .Values.agent.function_name }}
  value: {{ .Values.agent.function_name | quote }}
{{- else }}
  value: "MyAgentFunction"
{{- end }}
{{- end }}
