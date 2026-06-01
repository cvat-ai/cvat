# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Text normalization for the audio QE pipeline.

Pipeline of small composable steps. Pick a preset (`basic`) or build
custom pipelines (e.g. `[unicode, casefold, collapse_whitespace]`).
Layered design lets project-specific rules live next to universal
Unicode / whitespace cleanup without forking the normalizer code.
`step_available(name)` and fall back to DIY equivalents.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Callable

from .config import NormalizerConfig, StepConfig
from .data import NormalizerMode

_ZERO_WIDTH_RE = re.compile(r"[​‌‍⁠﻿­]")
_BRACKETED_RE = re.compile(r"\[[^\]]*\]|\([^\)]*\)|<[^>]*>")
_WS_RE = re.compile(r"\s+")

NormalizationStep = Callable[[str], str]
_STEP_REGISTRY: dict[str, Callable[..., NormalizationStep]] = {}


def register_step(name: str):
    def deco(factory: Callable[..., NormalizationStep]) -> Callable[..., NormalizationStep]:
        _STEP_REGISTRY[name] = factory
        return factory

    return deco


def step_available(name: str) -> bool:
    return name in _STEP_REGISTRY


@register_step("unicode")
def _step_unicode(form: str = "NFKC") -> NormalizationStep:
    return lambda t: unicodedata.normalize(form, t)


@register_step("zero_width_strip")
def _step_zero_width_strip() -> NormalizationStep:
    return lambda t: _ZERO_WIDTH_RE.sub("", t)


@register_step("casefold")
def _step_casefold() -> NormalizationStep:
    """Locale-independent lowercase. Beats `.lower()` for Turkish/Azeri/German."""
    return lambda t: t.casefold()


@register_step("strip_brackets")
def _step_strip_brackets() -> NormalizationStep:
    """Remove [tags], (asides), <markup>. Useful for sound events / speaker tags."""
    return lambda t: _BRACKETED_RE.sub(" ", t)


@register_step("strip_punct")
def _step_strip_punct(preserve: list[str] | None = None) -> NormalizationStep:
    preserve_set = set(preserve or [])

    def fn(t: str) -> str:
        out = []
        for ch in t:
            if ch.isalnum() or ch.isspace() or ch in preserve_set:
                out.append(ch)
            else:
                cat = unicodedata.category(ch)
                # Keep modifier letters etc.; only strip explicit punct/symbols.
                if cat.startswith("P") or cat.startswith("S"):
                    out.append(" ")
                else:
                    out.append(ch)
        return "".join(out)

    return fn


@register_step("collapse_whitespace")
def _step_collapse_whitespace() -> NormalizationStep:
    return lambda t: _WS_RE.sub(" ", t).strip()


@register_step("unify_apostrophes")
def _step_unify_apostrophes() -> NormalizationStep:
    """Curly + modifier apostrophes → ASCII '. Run before contraction expansion."""
    return lambda t: t.replace("’", "'").replace("‘", "'").replace("ʼ", "'")


@register_step("unify_quotes")
def _step_unify_quotes() -> NormalizationStep:
    return lambda t: (t.replace("“", '"').replace("”", '"').replace("«", '"').replace("»", '"'))


# Preset stacks --------------------------------------------------------------


BASIC_STACK: list[StepConfig] = [
    StepConfig("unify_apostrophes"),
    StepConfig("unify_quotes"),
    StepConfig("unicode", {"form": "NFKC"}),
    StepConfig("zero_width_strip"),
    StepConfig("casefold"),
    StepConfig("strip_brackets"),
    StepConfig("strip_punct"),
    StepConfig("collapse_whitespace"),
]


def _build_step(cfg: StepConfig) -> NormalizationStep:
    try:
        factory = _STEP_REGISTRY[cfg.name]
    except KeyError as exc:
        raise ValueError(
            f"unknown normalization step {cfg.name!r}; available: {sorted(_STEP_REGISTRY)}"
        ) from exc
    return factory(**cfg.options)


class Normalizer:
    def __init__(self, cfg: NormalizerConfig) -> None:
        self.cfg = cfg
        if cfg.mode == NormalizerMode.NONE:
            steps_cfg: list[StepConfig] = []
        elif cfg.mode == NormalizerMode.BASIC:
            steps_cfg = BASIC_STACK
        elif cfg.mode == NormalizerMode.CUSTOM:
            steps_cfg = cfg.steps
        else:
            raise ValueError(
                f"normalizer mode must be one of "
                f"{[m.value for m in NormalizerMode]!r}, got {cfg.mode!r}"
            )
        self._steps: list[NormalizationStep] = [_build_step(s) for s in steps_cfg]
        self._step_names: list[str] = [s.name for s in steps_cfg]

    @property
    def step_names(self) -> list[str]:
        return list(self._step_names)

    def __call__(self, text: str) -> str:
        for step in self._steps:
            text = step(text)
        return text
