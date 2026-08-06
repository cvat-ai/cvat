---
title: 'Models'
linkTitle: 'Models'
weight: 8
aliases:
  - /docs/manual/advanced/models/
---

The Models page contains a list of AI models
deployed for semi-automatic and automatic annotation.
To deploy models, you will need to install the necessary components using
{{< ilink "/docs/administration/community/advanced/installation_automatic_annotation"
  "Semi-automatic and Automatic Annotation guide" >}}.
Consult {{< ilink "/docs/annotation/auto-annotation/ai-models" >}}
for more information on sources of models and ways of adding them.

To open the Models page, click the Models button on the navigation bar.
The list of models is presented in the form of a table. The parameters indicated for each model are the following:

- `Framework` the model is based on
- model `Name`
- model `Type`:
  - `detector` - used for automatic annotation
    (available in {{< ilink "/docs/annotation/auto-annotation/ai-tools#detectors" "detectors" >}}
    and {{< ilink "/docs/annotation/auto-annotation/automatic-annotation" "automatic annotation" >}})
  - `interactor` - used for semi-automatic shape annotation
    (available in {{< ilink "/docs/annotation/auto-annotation/ai-tools#interactors" "interactors" >}})
  - `tracker` - used for semi-automatic track annotation
    (available in {{< ilink "/docs/annotation/auto-annotation/ai-tools#trackers" "trackers" >}})
  - `reid` - used to combine individual objects into a track
    (available in {{< ilink "/docs/annotation/auto-annotation/automatic-annotation" "automatic annotation" >}})
- `Description` - brief description of the model
- `Labels` - list of the supported labels (only for the models of the `detectors` type)

![Models page example](/images/image099.jpg)
