{{- if .HasShortcode "release-section" -}}
{{ .Content | safeHTML }}
{{- else -}}
{{ .RawContent }}
{{- end -}}
