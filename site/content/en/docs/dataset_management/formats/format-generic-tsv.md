---
title: 'Generic TSV'
linkTitle: 'Generic TSV'
weight: 14
description: 'Import and export audio interval annotations in Generic TSV 1.0 format.'
---

Generic TSV 1.0 is CVAT's import and export format for audio interval annotations. It applies to
audio tasks only and contains annotations, not the audio recording.

## Generic TSV export

Exporting an audio task or job in **Generic TSV 1.0** produces a tab-separated `.tsv` file. The
file contains these columns:

| Column | Description |
| --- | --- |
| `id` | Interval identifier. |
| `filename` | Source audio filename. |
| `start` | Interval start timestamp. |
| `stop` | Interval end timestamp. |
| `label` | Interval label. |
| `source` | Annotation source. |
| `score` | Annotation confidence score. |

CVAT adds one column for each label attribute used by the task. Audio media cannot be included in
the exported dataset.

## Generic TSV import

To upload interval annotations, select **Generic TSV 1.0** in **Upload annotations** or
**Import annotations**, then provide a tab-separated `.tsv` file. The file must include `start`, `stop`, and
`label` columns:

```tsv
start	        stop	        label	    transcript
00:00:00.000	00:00:02.450	speech	    Hello, world.
00:00:03.100	00:00:04.000	music
```

`start` and `stop` accept `HH:MM:SS.fraction` timestamps. The optional `score` column sets the
interval confidence score. To import label attributes, add columns with names that match the
configured label attributes.
