# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Text normalization for the audio QE pipeline.

Pipeline of small composable steps. Pick a preset (`basic`) or build
custom pipelines (e.g. `[unicode, casefold, russian_yo,
collapse_whitespace]`). Layered design lets language-specific and
project-specific rules live next to universal Unicode / whitespace
cleanup without forking the normalizer code.
`step_available(name)` and fall back to DIY equivalents.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Callable

from .config import NormalizerConfig, StepConfig
from .data import NormalizerMode

# English contractions — used by `expand_contractions_en` step.
# Specific patterns first; broad `\w+n't` last so it can't eat exceptions.
_EN_CONTRACTIONS = [
    (r"\bcan't\b", "can not"),
    (r"\bwon't\b", "will not"),
    (r"\bshan't\b", "shall not"),
    (r"\bain't\b", "is not"),
    (r"\bi'm\b", "i am"),
    (r"\b(it|he|she|that|there|here|what|who|where|how|when|let)'s\b", r"\1 is"),
    (r"\b(i|you|we|they|who)'ve\b", r"\1 have"),
    (r"\b(i|you|he|she|it|we|they)'ll\b", r"\1 will"),
    (r"\b(i|you|he|she|it|we|they)'d\b", r"\1 would"),
    (
        r"\b(do|does|did|is|are|was|were|have|has|had|would|could|should|will|"
        r"wouldn|shouldn|couldn|don|doesn|didn|isn|aren|wasn|weren|hasn|"
        r"haven|hadn|mustn|needn)'t\b",
        r"\1 not",
    ),
]

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


@register_step("substitutions")
def _step_substitutions(map: dict[str, str] | None = None) -> NormalizationStep:
    items = list((map or {}).items())

    def fn(t: str) -> str:
        for src, dst in items:
            t = t.replace(src, dst)
        return t

    return fn


@register_step("regex_substitute")
def _step_regex_substitute(
    patterns: list[tuple[str, str]] | None = None, flags: int = 0
) -> NormalizationStep:
    compiled = [(re.compile(p, flags), r) for p, r in (patterns or [])]

    def fn(t: str) -> str:
        for p, r in compiled:
            t = p.sub(r, t)
        return t

    return fn


@register_step("expand_contractions_en")
def _step_expand_contractions_en() -> NormalizationStep:
    compiled = [(re.compile(p, re.IGNORECASE), r) for p, r in _EN_CONTRACTIONS]

    def fn(t: str) -> str:
        for p, r in compiled:
            t = p.sub(r, t)
        return t

    return fn


# Language-specific helpers — stdlib-only. Heavier ones (opencc, jaconv, pyarabic)
# live behind optional imports if/when needed.


@register_step("russian_yo")
def _step_russian_yo() -> NormalizationStep:
    """Collapse ё→е (Russian) — same word, two spellings in practice."""
    return lambda t: t.replace("ё", "е").replace("Ё", "Е")


@register_step("german_eszett")
def _step_german_eszett() -> NormalizationStep:
    """ß → ss. Common for Swiss-German compat or relaxed comparison."""
    return lambda t: t.replace("ß", "ss")


@register_step("arabic_alef_unify")
def _step_arabic_alef_unify() -> NormalizationStep:
    """أ إ آ → ا (hamza-bearing alef variants → bare alef)."""

    def fn(t: str) -> str:
        return t.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")

    return fn


@register_step("arabic_yaa_unify")
def _step_arabic_yaa_unify() -> NormalizationStep:
    """ى → ي (alef maqsura → yaa)."""
    return lambda t: t.replace("ى", "ي")


@register_step("strip_diacritics")
def _step_strip_diacritics() -> NormalizationStep:
    """Strip combining marks (Mn). Useful for Arabic harakat, Hebrew niqqud, etc."""

    def fn(t: str) -> str:
        decomposed = unicodedata.normalize("NFD", t)
        out = "".join(c for c in decomposed if unicodedata.category(c) != "Mn")
        return unicodedata.normalize("NFC", out)

    return fn


@register_step("arabic_tatweel_strip")
def _step_arabic_tatweel_strip() -> NormalizationStep:
    """Remove tatweel (ـ U+0640) — purely decorative elongation."""
    return lambda t: t.replace("ـ", "")


# Devanagari -----------------------------------------------------------------

# Precomposed nukta forms → canonical decomposed forms (via NFC after replace).
# Keep canonical NFC form to match modern data, but unify legacy variants.
_DEVANAGARI_NUKTA_MAP = {
    "क़": "क़",  # क़ → क + nukta
    "ख़": "ख़",  # ख़
    "ग़": "ग़",  # ग़
    "ज़": "ज़",  # ज़
    "ड़": "ड़",  # ड़
    "ढ़": "ढ़",  # ढ़
    "फ़": "फ़",  # फ़
    "य़": "य़",  # य़
}


@register_step("hindi_danda")
def _step_hindi_danda() -> NormalizationStep:
    """Danda ।  and double-danda ॥ → space."""
    return lambda t: t.replace("।", " ").replace("॥", " ")


@register_step("hindi_nukta_unify")
def _step_hindi_nukta_unify() -> NormalizationStep:
    """Decompose precomposed nukta letters; NFC re-composes consistently downstream."""
    items = list(_DEVANAGARI_NUKTA_MAP.items())

    def fn(t: str) -> str:
        for src, dst in items:
            t = t.replace(src, dst)
        return t

    return fn


@register_step("hindi_chandrabindu")
def _step_hindi_chandrabindu() -> NormalizationStep:
    """Chandrabindu ँ → anusvara ं  (collapse marks treated equivalent in speech)."""
    return lambda t: t.replace("ँ", "ं")


# CJK ------------------------------------------------------------------------

# Common Chinese / Japanese punctuation. NFKC already maps full-width ASCII
# punctuation; this catches genuinely-CJK punctuation that NFKC doesn't touch.
_CJK_PUNCT = "，。、；：？！…—·「」『』〈〉《》【】〖〗〔〕"


@register_step("cjk_punct_strip")
def _step_cjk_punct_strip() -> NormalizationStep:
    tbl = str.maketrans({ch: " " for ch in _CJK_PUNCT})
    return lambda t: t.translate(tbl)


# Turkish --------------------------------------------------------------------


@register_step("turkish_dotted_i")
def _step_turkish_dotted_i() -> NormalizationStep:
    """Locale-correct İ/I → i/ı. Apply before casefold for Turkish/Azeri."""

    def fn(t: str) -> str:
        return t.replace("İ", "i").replace(  # İ → i
            "I", "ı"
        )  # I → ı  (intentional; pair with casefold)

    return fn


# Dutch ----------------------------------------------------------------------


@register_step("dutch_ij_normalize")
def _step_dutch_ij_normalize() -> NormalizationStep:
    """Ligature ĳ/Ĳ → i+j / I+J. NFKC also does this; explicit step for clarity."""
    return lambda t: t.replace("ĳ", "ij").replace("Ĳ", "IJ")


# Optional third-party steps -------------------------------------------------
#
# Registered only when the matching package is importable. Calling
# `step_available(name)` lets presets fall back to DIY if missing.


def step_available(name: str) -> bool:
    return name in _STEP_REGISTRY


try:  # pragma: no cover - optional dependency
    import inflect as _inflect  # type: ignore

    _INFLECT_ENGINE = _inflect.engine()
    _NUM_RE = re.compile(r"-?\d+(?:[.,]\d+)?")

    @register_step("expand_numerals_en")
    def _step_expand_numerals_en() -> NormalizationStep:
        """Replace numbers with English words (`23` → `twenty three`).
        Requires `inflect` (MIT, ~250 KB). Skip step if not installed."""

        def to_words(match: re.Match[str]) -> str:
            raw = match.group(0).replace(",", ".")
            return _INFLECT_ENGINE.number_to_words(raw).replace("-", " ")

        return lambda t: _NUM_RE.sub(to_words, t)

except ImportError:  # pragma: no cover
    pass


try:  # pragma: no cover - optional dependency
    import ftfy as _ftfy  # type: ignore

    @register_step("ftfy_fix")
    def _step_ftfy_fix(
        normalization: str = "NFC",
        unescape_html: bool = True,
    ) -> NormalizationStep:
        """Robust input cleanup: mojibake, HTML entities, curly punct, ligatures,
        zero-width chars, NBSP. Requires `ftfy` (MIT, ~1 MB)."""

        cfg = _ftfy.TextFixerConfig(
            normalization=normalization,
            unescape_html=unescape_html,
        )
        return lambda t: _ftfy.fix_text(t, cfg)

except ImportError:  # pragma: no cover
    pass


try:  # pragma: no cover - optional dependency
    import zhconv as _zhconv  # type: ignore

    @register_step("zhconv_simplify")
    def _step_zhconv_simplify(variant: str = "zh-cn") -> NormalizationStep:
        """Convert Chinese to Simplified. variant: zh-cn (mainland), zh-sg, zh-my.
        Requires `zhconv` (MIT, ~700 KB)."""
        return lambda t: _zhconv.convert(t, variant)

    @register_step("zhconv_traditional")
    def _step_zhconv_traditional(variant: str = "zh-tw") -> NormalizationStep:
        """Convert Chinese to Traditional. variant: zh-tw (Taiwan), zh-hk (HK)."""
        return lambda t: _zhconv.convert(t, variant)

except ImportError:  # pragma: no cover
    pass


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


# Language presets. Each preset is built as:
#   <prefix>  →  <unicode + script-specific>  →  <suffix>
# The prefix prefers `ftfy_fix` if available (handles mojibake / HTML /
# curly punct / zero-width / ligatures in one robust step). Otherwise it
# falls back to DIY apostrophe + quote + zero-width steps.


def _prefix_steps(use_ftfy: bool) -> list[StepConfig]:
    if use_ftfy and step_available("ftfy_fix"):
        return [
            StepConfig("ftfy_fix", {"normalization": "NFC", "unescape_html": True}),
            StepConfig("strip_brackets"),
        ]
    return [
        StepConfig("unify_apostrophes"),
        StepConfig("unify_quotes"),
        StepConfig("zero_width_strip"),
        StepConfig("strip_brackets"),
    ]


_SUFFIX_STEPS: list[StepConfig] = [
    StepConfig("strip_punct"),
    StepConfig("collapse_whitespace"),
]


def _lang_body(code: str, *, use_zhconv: bool) -> list[StepConfig]:
    if code == "en":
        return [
            StepConfig("unicode", {"form": "NFKC"}),
            StepConfig("casefold"),
            StepConfig("expand_contractions_en"),
        ]
    if code in ("es", "fr", "it", "pt", "pl"):
        return [StepConfig("unicode", {"form": "NFC"}), StepConfig("casefold")]
    if code == "de":
        return [
            StepConfig("unicode", {"form": "NFC"}),
            StepConfig("casefold"),
            StepConfig("german_eszett"),
        ]
    if code == "nl":
        return [
            StepConfig("unicode", {"form": "NFC"}),
            StepConfig("dutch_ij_normalize"),
            StepConfig("casefold"),
        ]
    if code == "ru":
        return [
            StepConfig("unicode", {"form": "NFC"}),
            StepConfig("casefold"),
            StepConfig("russian_yo"),
        ]
    if code == "tr":
        return [
            StepConfig("unicode", {"form": "NFC"}),
            StepConfig("turkish_dotted_i"),
            StepConfig("casefold"),
        ]
    if code == "zh":
        steps: list[StepConfig] = [
            StepConfig("unicode", {"form": "NFKC"}),
            StepConfig("cjk_punct_strip"),
        ]
        if use_zhconv and step_available("zhconv_simplify"):
            steps.append(StepConfig("zhconv_simplify", {"variant": "zh-cn"}))
        return steps
    if code == "ja":
        return [
            StepConfig("unicode", {"form": "NFKC"}),
            StepConfig("cjk_punct_strip"),
        ]
    if code == "ko":
        return [
            StepConfig("unicode", {"form": "NFC"}),
            StepConfig("cjk_punct_strip"),
        ]
    if code == "hi":
        return [
            StepConfig("hindi_nukta_unify"),
            StepConfig("unicode", {"form": "NFC"}),
            StepConfig("hindi_danda"),
            StepConfig("hindi_chandrabindu"),
        ]
    if code == "ar":
        return [
            StepConfig("unicode", {"form": "NFC"}),
            StepConfig("arabic_tatweel_strip"),
            StepConfig("arabic_alef_unify"),
            StepConfig("arabic_yaa_unify"),
            StepConfig("strip_diacritics"),
        ]
    raise ValueError(f"no preset for language {code!r}")


SUPPORTED_LANGS: tuple[str, ...] = (
    "en",
    "es",
    "fr",
    "de",
    "it",
    "pt",
    "nl",
    "pl",
    "ru",
    "tr",
    "zh",
    "ja",
    "ko",
    "hi",
    "ar",
)


def lang_preset(
    code: str,
    *,
    with_numerals: bool = False,
    use_ftfy: bool = True,
    use_zhconv: bool = True,
) -> NormalizerConfig:
    """Build a NormalizerConfig for a language code.

    `use_ftfy` / `use_zhconv` are opt-out flags — when the optional libs are
    installed they replace DIY steps; flip to False for fully-deterministic DIY
    output regardless of installed packages.
    """

    if code not in SUPPORTED_LANGS:
        raise ValueError(f"no preset for language {code!r}; available: {sorted(SUPPORTED_LANGS)}")
    steps: list[StepConfig] = [
        *_prefix_steps(use_ftfy),
        *_lang_body(code, use_zhconv=use_zhconv),
        *_SUFFIX_STEPS,
    ]
    if with_numerals and code == "en" and step_available("expand_numerals_en"):
        idx = next((i for i, s in enumerate(steps) if s.name == "strip_punct"), len(steps))
        steps.insert(idx, StepConfig("expand_numerals_en"))
    return NormalizerConfig(mode=NormalizerMode.CUSTOM, steps=steps)


# Backward-compatible attribute for code that read LANG_PRESETS as a dict.
LANG_PRESETS: dict[str, list[StepConfig]] = {
    code: lang_preset(code).steps for code in SUPPORTED_LANGS
}


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
