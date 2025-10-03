import torch
import os
import sys
from pathlib import Path
import importlib
import inspect
import ltr.admin.settings as ws_settings


def load_trained_network(workspace_dir, network_path, checkpoint=None):
    """OUTDATED. Use load_pretrained instead!"""
    checkpoint_dir = os.path.join(workspace_dir, 'checkpoints')
    directory = '{}/{}'.format(checkpoint_dir, network_path)

    net, _ = load_network(directory, checkpoint)
    return net


def load_pretrained(module, name, checkpoint=None, **kwargs):
    """Load a network trained using the LTR framework. This is useful when you want to initialize your new network with
    a previously trained model.
    args:
        module  -  Name of the train script module. I.e. the name of the folder in ltr/train_scripts.
        name  -  The name of the train_script.
        checkpoint  -  You can supply the checkpoint number or the full path to the checkpoint file (see load_network).
        **kwargs  -  These are passed to load_network (see that function).
    """

    settings = ws_settings.Settings()
    network_dir = os.path.join(settings.env.workspace_dir, 'checkpoints', 'ltr', module, name)
    return load_network(network_dir=network_dir, checkpoint=checkpoint, **kwargs)


def load_network(network_dir=None, checkpoint=None, constructor_fun_name=None, constructor_module=None, **kwargs):
    """Loads a network checkpoint file.

    Can be called in two different ways:
        load_checkpoint(network_dir):
            Loads the checkpoint file given by the path. If checkpoint_dir is a directory,
            it tries to find the latest checkpoint in that directory.

        load_checkpoint(network_dir, checkpoint=epoch_num):
            Loads the network at the given epoch number (int).

    The extra keyword arguments are supplied to the network constructor to replace saved ones.
    """

    if network_dir is not None:
        net_path = Path(network_dir)
    else:
        net_path = None

    if net_path.is_file():
        checkpoint = str(net_path)

    if checkpoint is None:
        # Load most recent checkpoint
        checkpoint_list = sorted(net_path.glob('*.pth.tar'))
        if checkpoint_list:
            checkpoint_path = checkpoint_list[-1]
        else:
            raise Exception('No matching checkpoint file found')
    elif isinstance(checkpoint, int):
        # Checkpoint is the epoch number
        checkpoint_list = sorted(net_path.glob('*_ep{:04d}.pth.tar'.format(checkpoint)))
        if not checkpoint_list or len(checkpoint_list) == 0:
            raise Exception('No matching checkpoint file found')
        if len(checkpoint_list) > 1:
            raise Exception('Multiple matching checkpoint files found')
        else:
            checkpoint_path = checkpoint_list[0]
    elif isinstance(checkpoint, str):
        # Checkpoint is the path
        checkpoint_path = os.path.expanduser(checkpoint)
    else:
        raise TypeError

    # Load network
    checkpoint_dict = torch_load_legacy(checkpoint_path)

    # Construct network model
    if 'constructor' in checkpoint_dict and checkpoint_dict['constructor'] is not None:
        net_constr = checkpoint_dict['constructor']
        if constructor_fun_name is not None:
            net_constr.fun_name = constructor_fun_name
        if constructor_module is not None:
            net_constr.fun_module = constructor_module
        # Legacy networks before refactoring
        if net_constr.fun_module.startswith('dlframework.'):
            net_constr.fun_module = net_constr.fun_module[len('dlframework.'):]
        net_fun = getattr(importlib.import_module(net_constr.fun_module), net_constr.fun_name)
        net_fun_args = list(inspect.signature(net_fun).parameters.keys())
        for arg, val in kwargs.items():
            if arg in net_fun_args:
                net_constr.kwds[arg] = val
            else:
                print('WARNING: Keyword argument "{}" not found when loading network. It was ignored.'.format(arg))
        net = net_constr.get()
    else:
        raise RuntimeError('No constructor for the given network.')

    net.load_state_dict(checkpoint_dict['net'], strict=False)

    net.constructor = checkpoint_dict['constructor']
    if 'net_info' in checkpoint_dict and checkpoint_dict['net_info'] is not None:
        net.info = checkpoint_dict['net_info']

    return net, checkpoint_dict


def load_weights(net, path, strict=True):
    checkpoint_dict = torch.load(path, weights_only=False)
    weight_dict = checkpoint_dict['net']
    net.load_state_dict(weight_dict, strict=strict)
    return net


def torch_load_legacy(path):
    """Load network with legacy environment."""

    # Setup legacy env (for older networks)
    _setup_legacy_env()

    # Load network
    checkpoint_dict = torch.load(path, weights_only=False, map_location='cpu')

    # Cleanup legacy
    _cleanup_legacy_env()

    return checkpoint_dict


def _setup_legacy_env():
    importlib.import_module('ltr')
    sys.modules['dlframework'] = sys.modules['ltr']
    sys.modules['dlframework.common'] = sys.modules['ltr']
    importlib.import_module('ltr.admin')
    sys.modules['dlframework.common.utils'] = sys.modules['ltr.admin']
    for m in ('model_constructor', 'stats', 'settings', 'local'):
        importlib.import_module('ltr.admin.' + m)
        sys.modules['dlframework.common.utils.' + m] = sys.modules['ltr.admin.' + m]


def _cleanup_legacy_env():
    del_modules = []
    for m in sys.modules.keys():
        if m.startswith('dlframework'):
            del_modules.append(m)
    for m in del_modules:
        del sys.modules[m]
