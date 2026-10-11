---
title: 'Generic TSV'
linkTitle: 'Generic TSV'
weight: 14
description: 'Import and export audio interval annotations in Generic TSV 1.0 format.'
---

Generic TSV is CVAT's custom format for audio datasets. It only contains annotations
without audio recordings.

## Generic TSV export

Applicable to all audio tasks.

- Supported annotations: Intervals.
- Attributes: Supported.

Exporting an audio task or job in **Generic TSV 1.0** produces a tab-separated `.tsv` file. The
file contains these columns:

| Column | Description |
| --- | --- |
| `id` | Interval identifier. |
| `filename` | Source audio filename. |
| `subset` | Source task subset name, or `default` if not specified. |
| `start` | Interval start timestamp. |
| `stop` | Interval end timestamp. |
| `label` | Interval label. |
| `source` | Annotation source. |
| `score` | Annotation confidence score. |

CVAT adds one column for each label attribute used by the task. Audio media cannot be included in
the exported dataset.

## Generic TSV import

To upload interval annotations, select **Generic TSV 1.0** in **Upload annotations** or
**Import annotations**, then provide a tab-separated `.tsv` file.
The file must include the `filename`, `start`, `stop`, and `label` columns:

```tsv
filename	    start	        stop	        label	    transcript
recording.mp3	00:00:00.000	00:00:02.450	speech	    Hello, world.
recording.mp3	00:00:03.100	00:00:04.000	music
```

`start` and `stop` accept `HH:MM:SS.fraction` timestamps. The optional `score` column sets the
interval confidence score. To import label attributes, add columns with names that match the
configured label attributes.
