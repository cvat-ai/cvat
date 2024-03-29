---
title: 'Models'
linkTitle: 'Models'
weight: 13
---

To deploy the models, you will need to install the necessary components using
{{< ilink "/docs/administration/advanced/installation_automatic_annotation"
  "Semi-automatic and Automatic Annotation guide" >}}.
To learn how to deploy the model, read
{{< ilink "/docs/manual/advanced/serverless-tutorial" "Serverless tutorial" >}}.

The Models page contains a list of deep learning (DL) models deployed for semi-automatic and automatic annotation.
To open the Models page, click the Models button on the navigation bar.
The list of models is presented in the form of a table. The parameters indicated for each model are the following:

- `Framework` the model is based on
- model `Name`
- model `Type`:
  - `detector` - used for automatic annotation
    (available in {{< ilink "/docs/manual/advanced/ai-tools#detectors" "detectors" >}}
    and {{< ilink "/docs/manual/advanced/automatic-annotation" "automatic annotation" >}})
  - `interactor` - used for semi-automatic shape annotation
    (available in {{< ilink "/docs/manual/advanced/ai-tools#interactors" "interactors" >}})
  - `tracker` - used for semi-automatic track annotation
    (available in {{< ilink "/docs/manual/advanced/ai-tools#trackers" "trackers" >}})
  - `reid` - used to combine individual objects into a track
    (available in {{< ilink "/docs/manual/advanced/automatic-annotation" "automatic annotation" >}})
- `Description` - brief description of the model
- `Labels` - list of the supported labels (only for the models of the `detectors` type)

![](/images/image099.jpg)
