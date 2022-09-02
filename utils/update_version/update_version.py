import argparse
from dataclasses import dataclass
from pathlib import Path
import re


CVAT_VERSION_PATTERN = r'VERSION\s*=\s*\((\d+),\s*(\d*),\s*(\d+),\s*[\',\"](\w+)[\',\"],\s*(\d+)\)'
COMPOSE_VERSION_PATTERN = r'(\$\{CVAT_VERSION:-)([\w.]+)(\})'

@dataclass()
class Version:
    major: int = 0
    minor: int = 0
    patch: int = 0
    prerelease: str = ''
    prerelease_number: int = 0

    def __str__(self) -> str:
        return f'{self.major}.{self.minor}.{self.patch}-{self.prerelease}.{self.prerelease_number}'

    def cvat_repr(self):
        return f"({self.major}, {self.minor}, {self.patch}, '{self.prerelease}', {self.prerelease_number})"

    def compose_repr(self):
        return f'v{self.major}.{self.minor}.{self.patch}'

    def increment_prerelease_number(self) -> None:
        self.prerelease_number += 1

    def increment_prerelease(self) -> None:
        flow = ('alpha', 'beta', 'rc', 'final')
        idx = flow.index(self.prerelease)
        if idx == len(flow) - 1:
            raise ValueError(f"Cannot increment current '{self.prerelease}' prerelease version")

        self.prerelease = flow[idx + 1]
        self._set_default_prerelease_number()

    def set_prerelease(self, value: str) -> None:
        values = ('alpha', 'beta', 'rc', 'final')
        if value not in values:
            raise ValueError(f'{value} is a wrong, must be one of {values}')

        self.prerelease = value
        self._set_default_prerelease_number()

    def increment_patch(self) -> None:
        self.patch += 1
        self._set_default_prerelease()

    def increment_minor(self) -> None:
        self.minor += 1
        self._set_default_patch()

    def increment_major(self) -> None:
        self.major += 1
        self._set_default_minor()

    def _set_default_prerelease_number(self) -> None:
        self.prerelease_number = 0

    def _set_default_prerelease(self) -> None:
        self.prerelease = 'alpha'
        self._set_default_prerelease_number()

    def _set_default_patch(self) -> None:
        self.patch = 0
        self._set_default_prerelease()

    def _set_default_minor(self) -> None:
        self.minor = 0
        self._set_default_patch()

def update_compose_config(new_version: Version) -> None:
    compose_file = get_compose_filename()
    with open(compose_file, 'r') as fp:
        compose_text = fp.read()

    if new_version.prerelease == 'final':
        new_version_repr = new_version.compose_repr()
    else:
        new_version_repr = 'dev'

    match = re.search(COMPOSE_VERSION_PATTERN, compose_text)
    if not match:
        raise RuntimeError('Cannot match version pattern')

    if match[2] != new_version_repr:
        compose_text = re.sub(COMPOSE_VERSION_PATTERN, f'\\g<1>{new_version_repr}\\g<3>', compose_text)
        with open(compose_file, 'w') as fp:
            fp.write(compose_text)

        print(f'\u2714 {compose_file} was updated. {match[2]} -> {new_version_repr}\n')

    else:
        print(f'\u2714 {compose_file} no need to update.')

def update_cvat_version(old_version: str, new_version: Version) -> None:
    version_file = get_cvat_version_filename()
    with open(version_file, 'r') as fp:
        version_text = fp.read()

    new_version_str = f'VERSION = {new_version.cvat_repr()}'
    version_text = version_text.replace(old_version, new_version_str)

    with open(version_file, 'w') as fp:
        fp.write(version_text)

    print(f'\u2714 {version_file} was updated. {old_version} -> {new_version_str}\n')

def verify_input(version_types: dict, args: dict) -> None:
    versions_to_bump = [args[v_type] for v_type in version_types]
    i = iter(versions_to_bump)
    if not any(i):
        raise ValueError(f'One of {list(version_types)} options must be specified')
    if any(i):
        raise ValueError(f'Only one of {list(version_types)} options accepted')

def get_cvat_version_filename() -> Path:
    return Path(__file__).resolve().parents[2] / 'cvat' / '__init__.py'

def get_compose_filename() -> Path:
    return Path(__file__).resolve().parents[2] / 'docker-compose.yml'

def get_current_version() -> tuple[str, Version]:
    version_file = get_cvat_version_filename()

    with open(version_file, 'r') as fp:
        version_text = fp.read()

    match = re.search(CVAT_VERSION_PATTERN, version_text)
    if not match:
        raise RuntimeError(f'Failed to find version in {version_file}')

    version = Version(int(match[1]), int(match[2]), int(match[3]), match[4], int(match[5]))
    return match[0], version

def main() -> None:
    version_types = {
        'major': {
            'action': 'store_true',
            'help': 'Increment the existing major version by 1',
        },
        'minor': {
            'action': 'store_true',
            'help': 'Increment the existing minor version by 1',
        },
        'patch': {
            'action': 'store_true',
            'help': 'Increment the existing patch version by 1',
        },
        'prerelease': {
            'nargs': '?',
            'const': 'increment',
            'help': '''Increment prerelease version alpha->beta->rc->final,
                    Also it's possible to pass value explicitly''',
        },
        'prerelease_number': {
            'action': 'store_true',
            'help': 'Increment prerelease number by 1',
        },
    }

    parser = argparse.ArgumentParser(description='Bump CVAT version')

    for v, v_config in version_types.items():
        parser.add_argument(f'--{v}', **v_config)

    parser.add_argument('--current', '--show-current',
        action='store_true', help='Display current version')

    args = parser.parse_args()

    version_str, version = get_current_version()

    if args.current:
        print(version)
        return

    try:
        verify_input(version_types, vars(args))
    except ValueError as e:
        print(f'\u2716 ERROR: {e}\n')
        parser.print_help()
        return

    if args.prerelease_number:
        version.increment_prerelease_number()

    elif args.prerelease:
        if args.prerelease  == 'increment':
            version.increment_prerelease()
        else:
            version.set_prerelease(args.prerelease)

    elif args.patch:
        version.increment_patch()

    elif args.minor:
        version.increment_minor()

    elif args.major:
        version.increment_major()

    print(f'\u2714 Bump version to {version}\n')

    update_cvat_version(version_str, version)
    update_compose_config(version)

if __name__ == '__main__':
    main()
