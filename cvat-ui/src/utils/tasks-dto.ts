export enum FileSource {
  Local = 1,
  Remote = 2,
  Share = 3,
}

export function fileModel(parentNode: any, files: any) {
  return files.map(
    (file: any) => {
      return {
        id: parentNode.props ? `${parentNode.props.value}/${file.name}` : file.name,
        isLeaf: file.type !== 'DIR',
        name: file.name,
      };
    }
  );
}

export function taskDTO(values: any) {
  const newTaskDTO = {
    name: values.name,
    labels: deserializeLabels(values.labels),
    image_quality: values.imageQuality,
    z_order: values.zOrder,
    bug_tracker: values.bugTracker,
    segment_size: values.segmentSize,
    overlap: values.overlapSize,
    frame_filter: values.frameFilter,
    start_frame: values.startFrame,
    stop_frame: values.stopFrame,
  };

  const newTask = new (window as any).cvat.classes.Task(newTaskDTO);

  if (values.source === FileSource.Local) {
    newTask.clientFiles = values.localUpload.fileList.map((file: any) => file.response);
  } else if (values.source === FileSource.Remote) {
    newTask.remoteFiles = values.remoteURL
      .split(/\r?\n/)
      .map((url: string) => url.trim())
      .filter((url: string) => url.length > 0);
  } else if (values.source === FileSource.Share) {
    newTask.serverFiles = values.sharedFiles;
  }

  return newTask;
}

export function validateLabels(rule: any, value: string, callback: Function) {
  if (value) {
    try {
      deserializeLabels(value);
    } catch (error) {
      callback(error.message);
    }
  }

  callback();
}

export function serializeLabels(task: any) {
  const labels = task.labels.map((label: any) => label.toJSON());

  let serialized = '';

  for (const label of labels) {
    serialized += ` ${label.name}`;

    for (const attr of label.attributes) {
      serialized += ` ${attr.mutable ? '~' : '@'}`;
      serialized += `${attr.input_type}=${attr.name}:`;
      serialized += attr.values.join(',');
    }
  }

  return serialized.trim();
}

export function deserializeLabels(serialized: string) {
  const normalized = serialized.replace(/'+/g, '\'').replace(/\s+/g, ' ').trim();
  const fragments = customSplit(normalized, ' ');
  const deserialized = [];

  let latest: any = null;

  for (let fragment of fragments) {
    fragment = fragment.trim();

    if ((fragment.startsWith('~')) || (fragment.startsWith('@'))) {
      const regex = /(@|~)(checkbox|select|number|text|radio)=([-,?!_0-9a-zA-Z()\s"]+):([-,?!_0-9a-zA-Z()"\s]+)/g;
      const result = regex.exec(fragment);

      if (result === null || latest === null) {
        throw Error('Bad labels format');
      }

      const values = customSplit(result[4], ',');

      latest.attributes.push({
        name: result[3].replace(/^"/, '').replace(/"$/, ''),
        mutable: result[1] === '~',
        input_type: result[2],
        default_value: values[0].replace(/^"/, '').replace(/"$/, ''),
        values: values.map(val => val.replace(/^"/, '').replace(/"$/, '')),
      });
    } else {
      latest = {
        name: fragment.replace(/^"/, '').replace(/"$/, ''),
        attributes: [],
      };

      deserialized.push(latest);
    }
  }

  return deserialized;
}

export function customSplit(string: any, separator: any) {
  const regex = /"/gi;
  const occurences = [];

  let occurence = regex.exec(string);

  while (occurence) {
    occurences.push(occurence.index);
    occurence = regex.exec(string);
  }

  if (occurences.length % 2) {
    occurences.pop();
  }

  let copy = '';

  if (occurences.length) {
    let start = 0;

    for (let idx = 0; idx < occurences.length; idx += 2) {
      copy += string.substr(start, occurences[idx] - start);
      copy += string.substr(occurences[idx], occurences[idx + 1] - occurences[idx] + 1)
          .replace(new RegExp(separator, 'g'), '\0');
      start = occurences[idx + 1] + 1;
    }

    copy += string.substr(occurences[occurences.length - 1] + 1);
  } else {
    copy = string;
  }

  return copy.split(new RegExp(separator, 'g')).map(x => x.replace(/\0/g, separator));
}
