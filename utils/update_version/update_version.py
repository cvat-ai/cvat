import argparse
from dataclasses import dataclass
from pathlib import Path
import re


SUCCESS_CHAR = '\u2714'
FAIL_CHAR = '\u2716'

CVAT_VERSION_PATTERN = re.compile(r'VERSION\s*=\s*\((\d+),\s*(\d*),\s*(\d+),\s*[\',\"](\w+)[\',\"],\s*(\d+)\)')
COMPOSE_VERSION_PATTERN = re.compile(r'(\$\{CVAT_VERSION:-)([\w.]+)(\})')
HELM_VERSION_PATTERN = re.compile(r'(^    image: cvat/(?:ui|server)\n    tag: )([\w.]+)', re.M)

REPO_ROOT_DIR = Path(__file__).resolve().parents[2]

CVAT_INIT_PY_PATH = REPO_ROOT_DIR / 'cvat/__init__.py'
COMPOSE_FILE_PATH = REPO_ROOT_DIR / 'docker-compose.yml'
HELM_VALUES_PATH = REPO_ROOT_DIR / 'helm-chart/values.yaml'

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
    compose_text = COMPOSE_FILE_PATH.read_text()

    if new_version.prerelease == 'final':
        new_version_repr = new_version.compose_repr()
    else:
        new_version_repr = 'dev'

    match = re.search(COMPOSE_VERSION_PATTERN, compose_text)
    if not match:
        raise RuntimeError('Cannot match version pattern')

    if match[2] != new_version_repr:
        compose_text = re.sub(COMPOSE_VERSION_PATTERN, f'\\g<1>{new_version_repr}\\g<3>', compose_text)
        COMPOSE_FILE_PATH.write_text(compose_text)

        print(f'{SUCCESS_CHAR} {COMPOSE_FILE_PATH} was updated. {match[2]} -> {new_version_repr}\n')

    else:
        print(f'{SUCCESS_CHAR} {COMPOSE_FILE_PATH} no need to update.')

def update_cvat_version(old_version: str, new_version: Version) -> None:
    version_text = CVAT_INIT_PY_PATH.read_text()

    new_version_str = f'VERSION = {new_version.cvat_repr()}'
    version_text = version_text.replace(old_version, new_version_str)

    CVAT_INIT_PY_PATH.write_text(version_text)

    print(f'{SUCCESS_CHAR} {CVAT_INIT_PY_PATH} was updated. {old_version} -> {new_version_str}\n')

def update_helm_version(new_version: Version) -> None:
    helm_values_text = HELM_VALUES_PATH.read_text()

    if new_version.prerelease == 'final':
        new_version_repr = new_version.compose_repr()
    else:
        new_version_repr = 'dev'

    match = re.search(HELM_VERSION_PATTERN, helm_values_text)
    if not match:
        raise RuntimeError('Cannot match version pattern')

    if match[2] != new_version_repr:
        helm_values_text = re.sub(HELM_VERSION_PATTERN, f'\\g<1>{new_version_repr}', helm_values_text, 2)
        HELM_VALUES_PATH.write_text(helm_values_text)

        print(f'{SUCCESS_CHAR} {HELM_VALUES_PATH} was updated. {match[2]} -> {new_version_repr}\n')

    else:
        print(f'{SUCCESS_CHAR} {HELM_VALUES_PATH} no need to update.')


def get_current_version() -> 'tuple[str, Version]':
    version_text = CVAT_INIT_PY_PATH.read_text()

    match = re.search(CVAT_VERSION_PATTERN, version_text)
    if not match:
        raise RuntimeError(f'Failed to find version in {CVAT_INIT_PY_PATH}')

    version = Version(int(match[1]), int(match[2]), int(match[3]), match[4], int(match[5]))
    return match[0], version

def main() -> None:
    parser = argparse.ArgumentParser(description='Bump CVAT version')

    action_group = parser.add_mutually_exclusive_group(required=True)

    action_group.add_argument('--major', action='store_true',
        help='Increment the existing major version by 1')
    action_group.add_argument('--minor', action='store_true',
        help='Increment the existing minor version by 1')
    action_group.add_argument('--patch', action='store_true',
        help='Increment the existing patch version by 1')
    action_group.add_argument('--prerelease', nargs='?', const='increment',
        help='''Increment prerelease version alpha->beta->rc->final,
                Also it's possible to pass value explicitly''')
    action_group.add_argument('--prerelease_number', action='store_true',
        help='Increment prerelease number by 1')

    action_group.add_argument('--current', '--show-current',
        action='store_true', help='Display current version')

    args = parser.parse_args()

    version_str, version = get_current_version()

    if args.current:
        print(version)
        return

    elif args.prerelease_number:
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

    else:
        assert False, "Unreachable code"

    print(f'{SUCCESS_CHAR} Bump version to {version}\n')

    update_cvat_version(version_str, version)
    update_compose_config(version)
    update_helm_version(version)

if __name__ == '__main__':
    main()
