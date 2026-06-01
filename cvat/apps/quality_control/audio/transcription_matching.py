# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Transcription quality estimation.

Tokenize, group, align, score. Owns:

  * Tokenization (word / character)
  * Per-chunk cost functions (equality / error-rate / normalized-lev)
    and aggregation across alignments
  * Levenshtein alignment over tokens, with an overlap-constrained
    variant that forbids matches between tokens whose source intervals
    don't temporally intersect
  * Char-level DP with word-boundary reconstruction (handles N-to-M
    boundary disagreements naturally as `boundary` edits)
  * Group-level orchestration (join / filter strategies) — entry
    point `run_transcription_qe()`.
"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterator
from typing import Callable, Sequence

import numpy as np
import regex

from .config import TranscriptionRequirement
from .data import (
    AlignMode,
    EditOp,
    Granularity,
    GroupingStrategy,
    GroupKey,
    Interval,
    Metric,
)
from .interval_matching import _two_stage_match, iou
from .normalization import Normalizer
from .reports import (
    AlignmentEdit,
    AlignmentResult,
    FilterPairAlignment,
    GroupAlignment,
    TranscriptionReport,
)

# `\X` matches one extended grapheme cluster — keeps combining marks
# (Indic, Arabic diacritics) and emoji ZWJ sequences as a single unit.
_GRAPHEMES_RE = regex.compile(r"\X")


def _iter_graphemes(text: str) -> Iterator[str]:
    """Yield each extended grapheme cluster in `text`. Single source of
    truth for character-level iteration across char-granularity
    tokenization and the char-stream alignment paths."""
    for m in _GRAPHEMES_RE.finditer(text):
        yield m.group()


# ============================ Tokenization ====================================


def tokenize(text: str, *, granularity: Granularity) -> list[str]:
    if granularity == Granularity.WORD:
        return text.split()
    if granularity == Granularity.CHARACTER:
        return list(_iter_graphemes(text))
    raise AssertionError(granularity)


# ============================ Per-chunk cost functions =======================


def _char_edit_distance(a: str, b: str) -> int:
    """Plain Levenshtein over characters. Short strings (typically <30 chars),
    pure-Python is fine."""
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(
                min(
                    cur[-1] + 1,  # insert
                    prev[j] + 1,  # delete
                    prev[j - 1] + (0 if ca == cb else 1),  # substitute
                )
            )
        prev = cur
    return prev[-1]


def _cost_equality(a: str, b: str) -> float:
    return 0.0 if a == b else 1.0


def _cost_error_rate(a: str, b: str) -> float:
    """edits / len(ref). Recall-shaped; can exceed 1 when hyp is much longer."""

    if a == b:
        return 0.0
    denom = len(a) or 1
    return _char_edit_distance(a, b) / denom


def _cost_normalized_lev(a: str, b: str) -> float:
    """
    edits / max(len). Bounded in [0, 1]; symmetric.
    Standard name in the literature: normalized Levenshtein distance (NED).
    """

    if a == b:
        return 0.0
    denom = max(len(a), len(b)) or 1
    return _char_edit_distance(a, b) / denom


_METRIC_FNS: dict[Metric, Callable[[str, str], float]] = {
    Metric.EQUALITY: _cost_equality,
    Metric.ERROR_RATE: _cost_error_rate,
    Metric.NORMALIZED_LEV: _cost_normalized_lev,
}
_METRIC_NAMES = tuple(m.value for m in _METRIC_FNS)

# A token-pair cost: substitution cost between a ref and a hyp token
TokenCost = Callable[[str, str], float]


def _unit_sub_cost(a: str, b: str) -> float:
    """Default substitution cost: 1 for any non-identical pair (plain
    Levenshtein). Identical pairs are handled as matches (cost 0) by the
    caller, so this is only ever invoked for a != b."""
    return 1.0


def make_token_cost(metric: Metric | str, threshold: float | None) -> TokenCost:
    try:
        metric = Metric(metric)
    except ValueError as exc:
        raise ValueError(f"unknown metric {metric!r}; choices: {list(_METRIC_NAMES)}") from exc

    metric_fn = _METRIC_FNS[metric]
    if threshold is None:
        return metric_fn

    def thresholded(a: str, b: str) -> float:
        return 1.0 if metric_fn(a, b) > threshold else 0.0

    return thresholded


def _metric_label(
    metric: Metric,
    granularity: Granularity,
    *,
    threshold: float | None = None,
) -> str:
    """Display label = base unit (WER/CER) ± prefix per metric/threshold combo."""

    unit = "CER" if granularity == Granularity.CHARACTER else "WER"
    if metric == Metric.EQUALITY:
        return unit
    if threshold is not None:
        return f"fuzzy-{unit}"
    return f"soft-{unit}"


def _chunk_cost(
    e: AlignmentEdit,
    *,
    granularity: Granularity,
    token_cost: TokenCost,
) -> tuple[float, int]:
    """Returns (errors_in_granularity_units, ref_units_consumed) for one chunk.

    Per-chunk semantics:
      * granularity=char  →  errors = char-edit count, ref = char count
      * granularity=word  →  errors = token_cost(ref, hyp), ref = word count
                              (boundary chunks: applied to concatenated forms)
    Delete/insert chunks: 1 error per granularity unit, ref unchanged for inserts.
    """

    is_char = granularity == Granularity.CHARACTER

    if e.op == EditOp.EQUAL:
        if is_char:
            return 0.0, sum(len(u) for u in e.ref_units)
        return 0.0, len(e.ref_units)

    if e.op == EditOp.SUBSTITUTE:
        errs = 0.0
        refs = 0
        for a, b in zip(e.ref_units, e.hyp_units):
            if is_char:
                errs += _char_edit_distance(a, b)
                refs += len(a)
            else:
                errs += token_cost(a, b)
                refs += 1
        return errs, refs

    if e.op == EditOp.BOUNDARY:
        ref_concat = " ".join(e.ref_units)
        hyp_concat = " ".join(e.hyp_units)
        if is_char:
            return float(_char_edit_distance(ref_concat, hyp_concat)), len(ref_concat)
        return token_cost(ref_concat, hyp_concat), len(e.ref_units)

    if e.op == EditOp.DELETE:
        if is_char:
            n = sum(len(u) for u in e.ref_units)
            return float(n), n
        n = len(e.ref_units)
        return float(n), n

    if e.op == EditOp.INSERT:
        if is_char:
            return float(sum(len(u) for u in e.hyp_units)), 0
        return float(len(e.hyp_units)), 0

    raise ValueError(f"unknown op {e.op}")


def aggregate_metric(
    alignments: Sequence[AlignmentResult],
    *,
    metric: Metric | str,
    threshold: float | None,
    granularity: Granularity,
) -> tuple[str, float]:
    """
    Aggregate the chosen metric across multiple alignments.
    Returns (display_label, rate).
    """

    token_cost = make_token_cost(metric, threshold)  # validates metric
    metric = Metric(metric)
    total_err: float = 0.0
    total_ref: int = 0
    for a in alignments:
        for e in a.edits:
            err, ref = _chunk_cost(e, granularity=granularity, token_cost=token_cost)
            total_err += err
            total_ref += ref

    rate = total_err / total_ref if total_ref else float("nan")
    return _metric_label(metric, granularity, threshold=threshold), rate


# ============================ Alignment =======================================


def _align_pair(
    ref_text: str,
    hyp_text: str,
    *,
    granularity: Granularity,
    normalizer: Normalizer,
    sub_cost: TokenCost = _unit_sub_cost,
) -> AlignmentResult:
    ref_n = normalizer(ref_text)
    hyp_n = normalizer(hyp_text)

    ref_units = tokenize(ref_n, granularity=granularity)
    hyp_units = tokenize(hyp_n, granularity=granularity)

    # Degenerate cases — deterministic answers, skip the DP.
    if not ref_units and not hyp_units:
        return AlignmentResult(granularity, ref_n, hyp_n, [], [], [], 0.0, 0, 0, 0, 0)
    if not ref_units:
        return AlignmentResult(
            granularity,
            ref_n,
            hyp_n,
            [],
            list(hyp_units),
            [AlignmentEdit(EditOp.INSERT, 0, 0, 0, len(hyp_units), [], list(hyp_units))],
            float("inf"),
            0,
            len(hyp_units),
            0,
            0,
        )
    if not hyp_units:
        return AlignmentResult(
            granularity,
            ref_n,
            hyp_n,
            list(ref_units),
            [],
            [AlignmentEdit(EditOp.DELETE, 0, len(ref_units), 0, 0, list(ref_units), [])],
            1.0,
            0,
            0,
            len(ref_units),
            0,
        )

    # Single pair → one notional interval per side → all-pass overlap.
    overlap = np.ones((1, 1), dtype=bool)
    edits, hits, subs, ins, dels, total_cost = _overlap_constrained_align(
        ref_units,
        [0] * len(ref_units),
        hyp_units,
        [0] * len(hyp_units),
        overlap,
        sub_cost=sub_cost,
    )
    error_rate = total_cost / len(ref_units)

    return AlignmentResult(
        granularity=granularity,
        ref_normalized=ref_n,
        hyp_normalized=hyp_n,
        ref_units=list(ref_units),
        hyp_units=list(hyp_units),
        edits=edits,
        error_rate=error_rate,
        substitutions=subs,
        insertions=ins,
        deletions=dels,
        hits=hits,
    )


# ============================ Transcription grouping + DP ========================


def group_key(interval: Interval, *, attribute: str | None) -> GroupKey:
    if attribute is None:
        return (interval.label, None)
    return (interval.label, interval.extra.get(attribute) or None)


def group_intervals(
    intervals: Sequence[Interval], *, attribute: str | None
) -> dict[GroupKey, list[Interval]]:
    out: dict[GroupKey, list[Interval]] = defaultdict(list)
    for iv in intervals:
        out[group_key(iv, attribute=attribute)].append(iv)
    return out


def _join_group_text(intervals: Sequence[Interval], *, text_attr: str, separator: str) -> str:
    in_order = sorted(intervals, key=lambda iv: (iv.start, iv.id))
    parts = [iv.extra.get(text_attr, "") for iv in in_order]
    return separator.join(p for p in parts if p)


def _normalize_tokenize_per_interval(
    intervals: Sequence[Interval],
    *,
    text_attr: str,
    normalizer: Normalizer,
    granularity: Granularity,
    inter_interval_sep: str = " ",
) -> tuple[list[str], list[int], list[Interval], list[str]]:
    """Returns (flat_units, per-unit interval index, sorted intervals, normalized text per interval).

    For char granularity, inserts inter_interval_sep tokens between adjacent
    non-empty intervals so word boundaries that fall at interval splits stay
    visible to the DP. For word granularity no separator is inserted: word DP
    doesn't see whitespace between tokens."""
    in_order = sorted(intervals, key=lambda iv: (iv.start, iv.id))
    flat_units: list[str] = []
    origins: list[int] = []
    norm_texts: list[str] = []
    is_char = granularity == Granularity.CHARACTER
    for idx, iv in enumerate(in_order):
        raw = iv.extra.get(text_attr, "")
        normed = normalizer(raw)
        norm_texts.append(normed)
        if is_char and flat_units and normed and inter_interval_sep:
            for ch in _iter_graphemes(inter_interval_sep):
                flat_units.append(ch)
                origins.append(idx - 1)
        for tok in tokenize(normed, granularity=granularity):
            flat_units.append(tok)
            origins.append(idx)
    return flat_units, origins, in_order, norm_texts


def _normalize_to_chars_per_interval(
    intervals: Sequence[Interval],
    *,
    text_attr: str,
    normalizer: Normalizer,
    inter_interval_sep: str = " ",
) -> tuple[list[str], list[int], list[Interval], list[str]]:
    """Build flat char streams + per-char interval origin index. Spaces between
    consecutive intervals get the previous interval's origin."""
    in_order = sorted(intervals, key=lambda iv: (iv.start, iv.id))
    chars: list[str] = []
    origins: list[int] = []
    norm_texts: list[str] = []
    for idx, interval in enumerate(in_order):
        raw = interval.extra.get(text_attr, "")
        normed = normalizer(raw)
        norm_texts.append(normed)
        if chars and inter_interval_sep and normed:
            for ch in _iter_graphemes(inter_interval_sep):
                chars.append(ch)
                origins.append(idx - 1)
        for ch in _iter_graphemes(normed):
            chars.append(ch)
            origins.append(idx)
    return chars, origins, in_order, norm_texts


def _overlap_matrix(
    gt_intervals: Sequence[Interval],
    ds_intervals: Sequence[Interval],
    *,
    tolerance_ms: float = 0.0,
) -> np.ndarray:
    """Boolean GTxDS matrix of temporally-overlapping interval pairs. With a
    positive `tolerance_ms`, intervals separated by a gap of up to that many
    milliseconds still count as overlapping, so the boundary tolerance relaxes
    the alignment overlap gate the same way it relaxes interval matching."""
    if not gt_intervals or not ds_intervals:
        return np.zeros((len(gt_intervals), len(ds_intervals)), dtype=bool)
    g_start = np.array([iv.start for iv in gt_intervals])
    g_stop = np.array([iv.stop for iv in gt_intervals])
    d_start = np.array([iv.start for iv in ds_intervals])
    d_stop = np.array([iv.stop for iv in ds_intervals])
    lo = np.maximum(g_start[:, None], d_start[None, :])
    hi = np.minimum(g_stop[:, None], d_stop[None, :])
    return hi > lo - tolerance_ms


def _overlap_constrained_align(
    ref_units: Sequence[str],
    ref_origins: Sequence[int],
    hyp_units: Sequence[str],
    hyp_origins: Sequence[int],
    overlap: np.ndarray,
    *,
    sub_cost: TokenCost = _unit_sub_cost,
) -> tuple[list[AlignmentEdit], int, int, int, int, int, float]:
    """Levenshtein DP that forbids match/substitute between tokens whose source
    intervals do not temporally overlap.

    `sub_cost(ref_token, hyp_token)` is the substitution cost folded into the
    DP objective, so the alignment minimizes the *metric* cost rather than the
    hard edit count. With the default unit cost this is plain Levenshtein.
    Insert / delete stay at cost 1. Identical tokens always cost 0 (a match),
    independent of `sub_cost`.

    Returns (edits, hits, substitutions, insertions, deletions, total_cost).
    `total_cost` is the optimal DP cost — the metric-weighted error mass, used
    to form the rate. The hits / subs / ins / dels are plain edit-op counts
    (integers). This DP emits only EQUAL / SUBSTITUTE / INSERT / DELETE; it does
    not produce BOUNDARY edits (N-to-M word merges are reconstructed separately
    by `_reconstruct_word_edits_from_chars` on a char-level alignment).
    """

    n, m = len(ref_units), len(hyp_units)
    INF = float("inf")
    DEL, INS, MATCH, SUB = 1, 2, 3, 4

    cost = np.full((n + 1, m + 1), INF, dtype=np.float32)
    back = np.zeros((n + 1, m + 1), dtype=np.int8)
    cost[0, 0] = 0.0
    for i in range(1, n + 1):
        cost[i, 0] = i
        back[i, 0] = DEL
    for j in range(1, m + 1):
        cost[0, j] = j
        back[0, j] = INS

    for i in range(1, n + 1):
        ru = ref_units[i - 1]
        ri = ref_origins[i - 1]
        for j in range(1, m + 1):
            del_c = cost[i - 1, j] + 1
            ins_c = cost[i, j - 1] + 1
            best, op = del_c, DEL
            if ins_c < best:
                best, op = ins_c, INS
            hj = hyp_origins[j - 1]
            if overlap[ri, hj]:
                if ru == hyp_units[j - 1]:
                    diag = cost[i - 1, j - 1]  # exact match, cost 0
                    cand_op = MATCH
                else:
                    diag = cost[i - 1, j - 1] + sub_cost(ru, hyp_units[j - 1])
                    cand_op = SUB
                if diag < best:
                    best, op = diag, cand_op

            cost[i, j] = best
            back[i, j] = op

    ops_rev: list[tuple[str, int, int, int, int]] = []
    i, j = n, m
    while i > 0 or j > 0:
        op = back[i, j]
        if op == MATCH:
            ops_rev.append((EditOp.EQUAL, i - 1, i, j - 1, j))
            i -= 1
            j -= 1
        elif op == SUB:
            ops_rev.append((EditOp.SUBSTITUTE, i - 1, i, j - 1, j))
            i -= 1
            j -= 1
        elif op == DEL:
            ops_rev.append((EditOp.DELETE, i - 1, i, j, j))
            i -= 1
        elif op == INS:
            ops_rev.append((EditOp.INSERT, i, i, j - 1, j))
            j -= 1
        else:
            break
    ops = list(reversed(ops_rev))

    edits: list[AlignmentEdit] = []
    for op_name, r_s, r_e, h_s, h_e in ops:
        if (
            edits
            and edits[-1].op == op_name
            and op_name in (EditOp.EQUAL, EditOp.SUBSTITUTE)
            and edits[-1].ref_end == r_s
            and edits[-1].hyp_end == h_s
        ):
            last = edits[-1]
            last.ref_end = r_e
            last.hyp_end = h_e
            last.ref_units += list(ref_units[r_s:r_e])
            last.hyp_units += list(hyp_units[h_s:h_e])
        elif (
            edits
            and edits[-1].op == EditOp.DELETE
            and op_name == EditOp.DELETE
            and edits[-1].ref_end == r_s
        ):
            edits[-1].ref_end = r_e
            edits[-1].ref_units += list(ref_units[r_s:r_e])
        elif (
            edits
            and edits[-1].op == EditOp.INSERT
            and op_name == EditOp.INSERT
            and edits[-1].hyp_end == h_s
        ):
            edits[-1].hyp_end = h_e
            edits[-1].hyp_units += list(hyp_units[h_s:h_e])
        else:
            edits.append(
                AlignmentEdit(
                    op=op_name,
                    ref_start=r_s,
                    ref_end=r_e,
                    hyp_start=h_s,
                    hyp_end=h_e,
                    ref_units=list(ref_units[r_s:r_e]),
                    hyp_units=list(hyp_units[h_s:h_e]),
                )
            )

    hits = sum(e.ref_end - e.ref_start for e in edits if e.op == EditOp.EQUAL)
    subs = sum(e.ref_end - e.ref_start for e in edits if e.op == EditOp.SUBSTITUTE)
    dels = sum(e.ref_end - e.ref_start for e in edits if e.op == EditOp.DELETE)
    ins = sum(e.hyp_end - e.hyp_start for e in edits if e.op == EditOp.INSERT)
    total_cost = float(cost[n, m])
    return edits, hits, subs, ins, dels, total_cost


def _tokenize_with_ranges(chars: Sequence[str]) -> tuple[list[tuple[int, int, str]], list[int]]:
    """Walk a char stream, return word ranges + per-char word index (-1 for spaces)."""
    words: list[tuple[int, int, str]] = []
    idx_per_char: list[int] = [-1] * len(chars)
    i = 0
    word_idx = 0
    while i < len(chars):
        if chars[i] == " ":
            i += 1
            continue
        start = i
        while i < len(chars) and chars[i] != " ":
            idx_per_char[i] = word_idx
            i += 1
        words.append((start, i, "".join(chars[start:i])))
        word_idx += 1
    return words, idx_per_char


def _reconstruct_word_edits_from_chars(
    ref_chars: Sequence[str],
    hyp_chars: Sequence[str],
    char_edits: list[AlignmentEdit],
) -> tuple[list[str], list[str], list[AlignmentEdit]]:
    """Convert a char-level alignment into a word-level edit list.

    Strategy:
      * Tokenize ref and hyp char streams into word ranges.
      * For each ref char that aligned (equal or sub), record which hyp word
        it landed in. Use that to choose each ref word's primary hyp
        destination (the hyp word containing most of its aligned chars).
      * Group consecutive ref words with the same primary destination → N-to-1
        boundary edit. Ref word spanning >1 hyp word → 1-to-N boundary.
      * Unconsumed hyp words appear as inserts in their natural order.
    """

    ref_words, ref_w_of_char = _tokenize_with_ranges(ref_chars)
    hyp_words, hyp_w_of_char = _tokenize_with_ranges(hyp_chars)

    ref_to_hyp_char: list[int | None] = [None] * len(ref_chars)
    for e in char_edits:
        if e.op in (EditOp.EQUAL, EditOp.SUBSTITUTE):
            for k in range(e.ref_end - e.ref_start):
                ref_to_hyp_char[e.ref_start + k] = e.hyp_start + k

    n_ref_words = len(ref_words)
    ref_dest_lists: list[list[int]] = [[] for _ in range(n_ref_words)]
    ref_primary: list[int | None] = [None] * n_ref_words
    for r_idx, (rs, re_, _r_word) in enumerate(ref_words):
        counts: dict[int, int] = {}
        order: list[int] = []
        for k in range(rs, re_):
            h_pos = ref_to_hyp_char[k]
            if h_pos is None or h_pos >= len(hyp_w_of_char):
                continue
            hw = hyp_w_of_char[h_pos]
            if hw < 0:
                continue
            if hw not in counts:
                order.append(hw)
            counts[hw] = counts.get(hw, 0) + 1
        ref_dest_lists[r_idx] = order
        if counts:
            ref_primary[r_idx] = max(counts, key=counts.get)

    hyp_will_be_used: list[bool] = [False] * len(hyp_words)
    for dests in ref_dest_lists:
        for hw in dests:
            hyp_will_be_used[hw] = True

    word_edits: list[AlignmentEdit] = []
    hyp_consumed: list[bool] = [False] * len(hyp_words)
    next_hyp_emit = 0

    def emit_pending_inserts(up_to_hyp_idx: int) -> None:
        nonlocal next_hyp_emit
        while next_hyp_emit < up_to_hyp_idx:
            if not hyp_consumed[next_hyp_emit] and not hyp_will_be_used[next_hyp_emit]:
                h_word = hyp_words[next_hyp_emit][2]
                ref_pos = word_edits[-1].ref_end if word_edits else 0
                word_edits.append(
                    AlignmentEdit(
                        op=EditOp.INSERT,
                        ref_start=ref_pos,
                        ref_end=ref_pos,
                        hyp_start=next_hyp_emit,
                        hyp_end=next_hyp_emit + 1,
                        ref_units=[],
                        hyp_units=[h_word],
                    )
                )
                hyp_consumed[next_hyp_emit] = True
            next_hyp_emit += 1

    r = 0
    while r < n_ref_words:
        primary = ref_primary[r]
        dests = ref_dest_lists[r]
        r_word = ref_words[r][2]

        if primary is None:
            hyp_pos = word_edits[-1].hyp_end if word_edits else next_hyp_emit
            word_edits.append(
                AlignmentEdit(
                    op=EditOp.DELETE,
                    ref_start=r,
                    ref_end=r + 1,
                    hyp_start=hyp_pos,
                    hyp_end=hyp_pos,
                    ref_units=[r_word],
                    hyp_units=[],
                )
            )
            r += 1
            continue

        emit_pending_inserts(primary)

        group_end = r
        while (
            group_end + 1 < n_ref_words
            and ref_primary[group_end + 1] == primary
            and len(ref_dest_lists[group_end + 1]) == 1
            and len(dests) == 1
        ):
            group_end += 1

        if group_end > r:
            group_ref_words = [ref_words[k][2] for k in range(r, group_end + 1)]
            h_word = hyp_words[primary][2]
            hyp_consumed[primary] = True
            word_edits.append(
                AlignmentEdit(
                    op=EditOp.BOUNDARY,
                    ref_start=r,
                    ref_end=group_end + 1,
                    hyp_start=primary,
                    hyp_end=primary + 1,
                    ref_units=group_ref_words,
                    hyp_units=[h_word],
                )
            )
            r = group_end + 1
            next_hyp_emit = max(next_hyp_emit, primary + 1)
            continue

        if len(dests) > 1:
            hyp_word_strs = [hyp_words[hw][2] for hw in dests]
            first_hw, last_hw = dests[0], dests[-1]
            for hw in dests:
                hyp_consumed[hw] = True
            word_edits.append(
                AlignmentEdit(
                    op=EditOp.BOUNDARY,
                    ref_start=r,
                    ref_end=r + 1,
                    hyp_start=first_hw,
                    hyp_end=last_hw + 1,
                    ref_units=[r_word],
                    hyp_units=hyp_word_strs,
                )
            )
            next_hyp_emit = max(next_hyp_emit, last_hw + 1)
        else:
            h_word = hyp_words[primary][2]
            hyp_consumed[primary] = True
            op = EditOp.EQUAL if r_word == h_word else EditOp.SUBSTITUTE
            word_edits.append(
                AlignmentEdit(
                    op=op,
                    ref_start=r,
                    ref_end=r + 1,
                    hyp_start=primary,
                    hyp_end=primary + 1,
                    ref_units=[r_word],
                    hyp_units=[h_word],
                )
            )
            next_hyp_emit = max(next_hyp_emit, primary + 1)

        r += 1

    emit_pending_inserts(len(hyp_words))

    merged: list[AlignmentEdit] = []
    for e in word_edits:
        if (
            merged
            and merged[-1].op == EditOp.DELETE
            and e.op == EditOp.DELETE
            and merged[-1].ref_end == e.ref_start
        ):
            merged[-1].ref_end = e.ref_end
            merged[-1].ref_units += e.ref_units
        elif (
            merged
            and merged[-1].op == EditOp.INSERT
            and e.op == EditOp.INSERT
            and merged[-1].hyp_end == e.hyp_start
        ):
            merged[-1].hyp_end = e.hyp_end
            merged[-1].hyp_units += e.hyp_units
        else:
            merged.append(e)

    ref_word_strs = [w for _, _, w in ref_words]
    hyp_word_strs = [w for _, _, w in hyp_words]
    return ref_word_strs, hyp_word_strs, merged


def _align_group_via_chars(
    gt_intervals: Sequence[Interval],
    ds_intervals: Sequence[Interval],
    *,
    text_attr: str,
    normalizer: Normalizer,
    separator: str = " ",
    sub_cost: TokenCost = _unit_sub_cost,
    overlap_tolerance_ms: float = 0.0,
) -> AlignmentResult:
    """Char-level overlap-constrained alignment with word-level edit
    reconstruction. Resulting AlignmentResult looks like a word-mode
    alignment from the caller's perspective.

    The key feature of this alignment mode is that it can allow flexibility
    on word boundaries. Spaces are just characters in the char-level DP, so
    any N-to-M boundary disagreement is captured naturally and reclassified
    as a `boundary` edit when reconstructing the word view.

    The char DP itself stays unit-cost (graphemes are atomic). `sub_cost`
    is the word-level cost applied when scoring the reconstructed word edits,
    so the reported `error_rate` is consistent with the chosen metric.
    """

    ref_chars, ref_origins, gt_sorted, ref_norm_parts = _normalize_to_chars_per_interval(
        gt_intervals,
        text_attr=text_attr,
        normalizer=normalizer,
        inter_interval_sep=separator,
    )
    hyp_chars, hyp_origins, ds_sorted, hyp_norm_parts = _normalize_to_chars_per_interval(
        ds_intervals,
        text_attr=text_attr,
        normalizer=normalizer,
        inter_interval_sep=separator,
    )

    ref_norm_joined = separator.join(p for p in ref_norm_parts if p)
    hyp_norm_joined = separator.join(p for p in hyp_norm_parts if p)

    if not ref_chars and not hyp_chars:
        return AlignmentResult(
            Granularity.WORD,
            ref_norm_joined,
            hyp_norm_joined,
            [],
            [],
            [],
            0.0,
            0,
            0,
            0,
            0,
        )

    overlaps = _overlap_matrix(gt_sorted, ds_sorted, tolerance_ms=overlap_tolerance_ms)

    # Char-level DP stays unit-cost: graphemes are atomic, so a word-level
    # metric has no meaning here. Word-level cost weighting happens in the
    # word-token path (`_align_group_with_overlap`).
    char_edits, _ch_hits, _ch_subs, _ch_ins, _ch_dels, _ = _overlap_constrained_align(
        ref_chars,
        ref_origins,
        hyp_chars,
        hyp_origins,
        overlaps,
    )

    ref_word_strs, hyp_word_strs, word_edits = _reconstruct_word_edits_from_chars(
        ref_chars,
        hyp_chars,
        char_edits,
    )

    hits = sum(e.ref_end - e.ref_start for e in word_edits if e.op == EditOp.EQUAL)
    subs = sum(e.ref_end - e.ref_start for e in word_edits if e.op == EditOp.SUBSTITUTE)
    dels = sum(e.ref_end - e.ref_start for e in word_edits if e.op == EditOp.DELETE)
    ins = sum(e.hyp_end - e.hyp_start for e in word_edits if e.op == EditOp.INSERT)

    # Score the reconstructed word edits with the chosen cost so error_rate
    # matches the cost function (BOUNDARY edits handled by _chunk_cost).
    total_err = 0.0
    total_ref = 0
    for e in word_edits:
        err, ref = _chunk_cost(e, granularity=Granularity.WORD, token_cost=sub_cost)
        total_err += err
        total_ref += ref
    error_rate = total_err / total_ref if total_ref else float("nan")

    ref_word_origins: list[int] = []
    for r_s, r_e, _ in _tokenize_with_ranges(ref_chars)[0]:
        ref_word_origins.append(ref_origins[r_s] if r_s < len(ref_origins) else 0)
    hyp_word_origins: list[int] = []
    for h_s, h_e, _ in _tokenize_with_ranges(hyp_chars)[0]:
        hyp_word_origins.append(hyp_origins[h_s] if h_s < len(hyp_origins) else 0)

    return AlignmentResult(
        granularity=Granularity.WORD,
        ref_normalized=ref_norm_joined,
        hyp_normalized=hyp_norm_joined,
        ref_units=ref_word_strs,
        hyp_units=hyp_word_strs,
        edits=word_edits,
        error_rate=error_rate,
        substitutions=subs,
        insertions=ins,
        deletions=dels,
        hits=hits,
        ref_origins=ref_word_origins,
        hyp_origins=hyp_word_origins,
    )


def _align_group_with_overlap(
    gt_intervals: Sequence[Interval],
    ds_intervals: Sequence[Interval],
    *,
    text_attr: str,
    granularity: Granularity,
    normalizer: Normalizer,
    separator: str,
    sub_cost: TokenCost = _unit_sub_cost,
    overlap_tolerance_ms: float = 0.0,
) -> AlignmentResult:
    """Join mode alignment that forbids token-level matches between intervals
    whose time spans don't overlap. Catches the most obvious spurious matches
    (e.g. "police" at t=24s ↔ "police" at t=180s).

    `sub_cost` weights the substitution cost inside the DP, so the alignment
    minimizes the chosen cost rather than the hard edit count. With the default
    unit cost the result matches plain Levenshtein. At char granularity the
    tokens are single graphemes, where every metric degenerates to equality, so
    the weighting is a no-op there."""

    ref_units, ref_origins, gt_sorted, ref_norm_parts = _normalize_tokenize_per_interval(
        gt_intervals,
        text_attr=text_attr,
        normalizer=normalizer,
        granularity=granularity,
        inter_interval_sep=separator,
    )
    hyp_units, hyp_origins, ds_sorted, hyp_norm_parts = _normalize_tokenize_per_interval(
        ds_intervals,
        text_attr=text_attr,
        normalizer=normalizer,
        granularity=granularity,
        inter_interval_sep=separator,
    )

    ref_norm_joined = separator.join(p for p in ref_norm_parts if p)
    hyp_norm_joined = separator.join(p for p in hyp_norm_parts if p)

    if not ref_units and not hyp_units:
        return AlignmentResult(
            granularity, ref_norm_joined, hyp_norm_joined, [], [], [], 0.0, 0, 0, 0, 0
        )
    if not ref_units:
        return AlignmentResult(
            granularity,
            ref_norm_joined,
            hyp_norm_joined,
            [],
            list(hyp_units),
            [AlignmentEdit(EditOp.INSERT, 0, 0, 0, len(hyp_units), [], list(hyp_units))],
            float("inf"),
            0,
            len(hyp_units),
            0,
            0,
        )
    if not hyp_units:
        return AlignmentResult(
            granularity,
            ref_norm_joined,
            hyp_norm_joined,
            list(ref_units),
            [],
            [AlignmentEdit(EditOp.DELETE, 0, len(ref_units), 0, 0, list(ref_units), [])],
            1.0,
            0,
            0,
            len(ref_units),
            0,
        )

    overlap = _overlap_matrix(gt_sorted, ds_sorted, tolerance_ms=overlap_tolerance_ms)
    edits, hits, subs, ins, dels, total_cost = _overlap_constrained_align(
        ref_units,
        ref_origins,
        hyp_units,
        hyp_origins,
        overlap,
        sub_cost=sub_cost,
    )
    # Rate uses the metric-weighted DP cost (total_cost), not the raw edit
    # count, so it is consistent with the objective the alignment minimized.
    error_rate = total_cost / len(ref_units)
    return AlignmentResult(
        granularity=granularity,
        ref_normalized=ref_norm_joined,
        hyp_normalized=hyp_norm_joined,
        ref_units=list(ref_units),
        hyp_units=list(hyp_units),
        edits=edits,
        error_rate=error_rate,
        substitutions=subs,
        insertions=ins,
        deletions=dels,
        hits=hits,
        ref_origins=list(ref_origins),
        hyp_origins=list(hyp_origins),
    )


# ============================ Entry point ========================================


def match_transcriptions(
    gt: Sequence[Interval], ds: Sequence[Interval], *, req: TranscriptionRequirement
) -> TranscriptionReport:
    normalizer = Normalizer(req.normalizer)
    token_cost = make_token_cost(req.metric, req.threshold)

    gt_groups = group_intervals(gt, attribute=req.grouping.attribute)
    ds_groups = group_intervals(ds, attribute=req.grouping.attribute)

    groups: list[GroupAlignment] = []
    missing: list[tuple[GroupKey, list[Interval]]] = []
    extra: list[tuple[GroupKey, list[Interval]]] = []
    pairs: list[FilterPairAlignment] = []
    pair_gt_unmatched: list[Interval] = []
    pair_ds_unmatched: list[Interval] = []

    all_keys = set(gt_groups) | set(ds_groups)

    match req.grouping.strategy:
        case GroupingStrategy.JOIN:
            for key in sorted(all_keys, key=lambda k: (k[0], k[1] or "")):
                gt_group = gt_groups.get(key, [])
                ds_group = ds_groups.get(key, [])
                if not gt_group:
                    extra.append((key, ds_group))
                    continue
                if not ds_group:
                    missing.append((key, gt_group))
                    continue

                if req.enforce_overlap:
                    aligner_params = {
                        "text_attr": req.text_attribute,
                        "normalizer": normalizer,
                        "separator": req.grouping.join_separator,
                        "sub_cost": token_cost,
                        "overlap_tolerance_ms": req.overlap_tolerance_ms,
                    }

                    match (req.align, req.granularity):
                        case (AlignMode.CHAR, Granularity.WORD):
                            aligner = _align_group_via_chars
                        case (AlignMode.CHAR, Granularity.CHARACTER | Granularity.WORD) | (
                            AlignMode.WORD,
                            Granularity.WORD,
                        ):
                            aligner = _align_group_with_overlap
                            aligner_params["granularity"] = req.granularity
                        case (align, granularity):
                            assert (
                                False
                            ), f"Unknown alignment, granularity combination ({align, granularity})"

                    alignment = aligner(gt_group, ds_group, **aligner_params)
                else:
                    ref_text = _join_group_text(
                        gt_group,
                        text_attr=req.text_attribute,
                        separator=req.grouping.join_separator,
                    )
                    hyp_text = _join_group_text(
                        ds_group,
                        text_attr=req.text_attribute,
                        separator=req.grouping.join_separator,
                    )
                    alignment = _align_pair(
                        ref_text,
                        hyp_text,
                        granularity=req.granularity,
                        normalizer=normalizer,
                        sub_cost=token_cost,
                    )
                groups.append(GroupAlignment(key, gt_group, ds_group, alignment))

        case GroupingStrategy.FILTER:
            for key in sorted(all_keys, key=lambda k: (k[0], k[1] or "")):
                gt_group = gt_groups.get(key, [])
                ds_group = ds_groups.get(key, [])
                matches, _, gt_unmatched, ds_unmatched = _two_stage_match(
                    gt_group, ds_group, iou_thresh=req.iou_threshold
                )
                for gt_ann, ds_ann in matches:
                    ref_text = gt_ann.extra.get(req.text_attribute, "")
                    hyp_text = ds_ann.extra.get(req.text_attribute, "")
                    pairs.append(
                        FilterPairAlignment(
                            gt=gt_ann,
                            ds=ds_ann,
                            iou=iou(gt_ann, ds_ann),
                            onset_delta=ds_ann.start - gt_ann.start,
                            offset_delta=ds_ann.stop - gt_ann.stop,
                            alignment=_align_pair(
                                ref_text,
                                hyp_text,
                                granularity=req.granularity,
                                normalizer=normalizer,
                                sub_cost=token_cost,
                            ),
                        )
                    )
                pair_gt_unmatched.extend(gt_unmatched)
                pair_ds_unmatched.extend(ds_unmatched)
        case grouping:
            assert False, f"Unknown grouping '{grouping}'"

    return TranscriptionReport(
        requirement=req,
        groups=groups,
        missing_groups=missing,
        extra_groups=extra,
        pairs=pairs,
        pair_gt_unmatched=pair_gt_unmatched,
        pair_ds_unmatched=pair_ds_unmatched,
    )
