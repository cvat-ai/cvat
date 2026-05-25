"""
L2 layer of the audio QE pipeline — transcription quality estimation.

Tokenize, group, align, score. Owns:

  * Tokenization (sentence / word / character)
  * Per-chunk cost functions (equality / error-rate / normalized-lev)
    and aggregation across alignments
  * Levenshtein alignment over tokens, with an overlap-constrained
    variant that forbids matches between tokens whose source intervals
    don't temporally intersect
  * Char-level DP with word-boundary reconstruction (handles N-to-M
    boundary disagreements naturally as `boundary` edits)
  * Group-level orchestration (join / filter strategies) — entry
    point `run_transcription_qe()`.

The top-level `compare()` orchestrator lives in `pipeline.py`.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Callable, Sequence

import jiwer
import numpy as np

from .config import TranscriptionRequirement
from .data import (
    AlignMode,
    AnnotationSet,
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


# ============================ Tokenization ====================================


def tokenize(text: str, granularity: Granularity) -> list[str]:
    if granularity == Granularity.SENTENCE:
        return [text] if text else []
    if granularity == Granularity.WORD:
        return text.split()
    if granularity == Granularity.CHARACTER:
        # Codepoint-level. Swap to grapheme clusters (`regex` lib) for CJK production use.
        return list(text)
    raise ValueError(granularity)


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
            cur.append(min(
                cur[-1] + 1,                            # insert
                prev[j] + 1,                            # delete
                prev[j - 1] + (0 if ca == cb else 1),   # substitute
            ))
        prev = cur
    return prev[-1]


def _cost_equality(a: str, b: str) -> float:
    return 0.0 if a == b else 1.0


def _cost_error_rate(a: str, b: str) -> float:
    """edits / len(ref). Recall-shaped; can exceed 1 when hyp is much longer."""
    if a == b:
        return 0.0
    denom = len(a) if a else 1
    return _char_edit_distance(a, b) / denom


def _cost_normalized_lev(a: str, b: str) -> float:
    """edits / max(len). Bounded in [0, 1]; symmetric. Standard name in the
    literature: normalized Levenshtein distance (NED)."""
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
    metric_fn: Callable[[str, str], float],
    threshold: float | None,
) -> tuple[float, int]:
    """Returns (errors_in_granularity_units, ref_units_consumed) for one chunk.

    Per-chunk semantics:
      * granularity=char  →  errors = char-edit count, ref = char count
      * granularity=word  →  errors = metric_fn(ref, hyp), ref = word count
                              (boundary chunks: applied to concatenated forms)
    Delete/insert chunks: 1 error per granularity unit, ref unchanged for inserts.
    Threshold (if set) rounds each per-pair cost: cost > threshold → 1.
    """

    is_char = granularity == Granularity.CHARACTER

    def round_(c: float) -> float:
        if threshold is None:
            return c
        return 1.0 if c > threshold else 0.0

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
                errs += round_(metric_fn(a, b))
                refs += 1
        return errs, refs

    if e.op == EditOp.BOUNDARY:
        ref_concat = " ".join(e.ref_units)
        hyp_concat = " ".join(e.hyp_units)
        if is_char:
            return float(_char_edit_distance(ref_concat, hyp_concat)), len(ref_concat)
        return round_(metric_fn(ref_concat, hyp_concat)), len(e.ref_units)

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


def _aggregate_metric(
    alignments: Sequence[AlignmentResult],
    *,
    metric: Metric,
    threshold: float | None,
    granularity: Granularity,
) -> tuple[str, float]:
    """Aggregate the chosen metric across multiple alignments.
    Returns (display_label, rate). Accepts `metric` as either a Metric
    enum member or its string value."""

    try:
        metric = Metric(metric)
    except ValueError as exc:
        raise ValueError(
            f"unknown metric {metric!r}; choices: {list(_METRIC_NAMES)}"
        ) from exc

    metric_fn = _METRIC_FNS[metric]
    total_err: float = 0.0
    total_ref: int = 0
    for a in alignments:
        for e in a.edits:
            err, ref = _chunk_cost(
                e,
                granularity=granularity,
                metric_fn=metric_fn,
                threshold=threshold,
            )
            total_err += err
            total_ref += ref

    rate = total_err / total_ref if total_ref else float("nan")
    return _metric_label(metric, granularity, threshold=threshold), rate


# ============================ Alignment =======================================


def _chunks_to_edits(
    chunks, ref_units: Sequence[str], hyp_units: Sequence[str]
) -> list[AlignmentEdit]:
    out: list[AlignmentEdit] = []
    for c in chunks:
        out.append(
            AlignmentEdit(
                op=EditOp(c.type),
                ref_start=c.ref_start_idx,
                ref_end=c.ref_end_idx,
                hyp_start=c.hyp_start_idx,
                hyp_end=c.hyp_end_idx,
                ref_units=list(ref_units[c.ref_start_idx : c.ref_end_idx]),
                hyp_units=list(hyp_units[c.hyp_start_idx : c.hyp_end_idx]),
            )
        )
    return out


def align_pair(
    ref_text: str,
    hyp_text: str,
    *,
    granularity: Granularity,
    normalizer: Normalizer,
) -> AlignmentResult:
    ref_n = normalizer(ref_text)
    hyp_n = normalizer(hyp_text)

    ref_units = tokenize(ref_n, granularity)
    hyp_units = tokenize(hyp_n, granularity)

    # Degenerate cases — keep jiwer out, deterministic answers.
    if not ref_units and not hyp_units:
        return AlignmentResult(granularity, ref_n, hyp_n, [], [], [], 0.0, 0, 0, 0, 0)
    if not ref_units:
        return AlignmentResult(
            granularity, ref_n, hyp_n, [], hyp_units,
            [AlignmentEdit(EditOp.INSERT, 0, 0, 0, len(hyp_units), [], list(hyp_units))],
            float("inf"), 0, len(hyp_units), 0, 0,
        )
    if not hyp_units:
        return AlignmentResult(
            granularity, ref_n, hyp_n, ref_units, [],
            [AlignmentEdit(EditOp.DELETE, 0, len(ref_units), 0, 0, list(ref_units), [])],
            1.0, 0, 0, len(ref_units), 0,
        )

    if granularity == Granularity.CHARACTER:
        out = jiwer.process_characters(ref_n, hyp_n)
        rate = out.cer
    else:
        if granularity == Granularity.SENTENCE:
            ref_token = ref_n.replace(" ", "␣") or "␣"
            hyp_token = hyp_n.replace(" ", "␣") or "␣"
            out = jiwer.process_words(ref_token, hyp_token)
        else:
            out = jiwer.process_words(ref_n, hyp_n)
        rate = out.wer

    chunks = out.alignments[0]
    refs_actual = out.references[0]
    hyps_actual = out.hypotheses[0]

    edits = _chunks_to_edits(chunks, refs_actual, hyps_actual)

    return AlignmentResult(
        granularity=granularity,
        ref_normalized=ref_n,
        hyp_normalized=hyp_n,
        ref_units=list(refs_actual),
        hyp_units=list(hyps_actual),
        edits=edits,
        wer=float(rate),
        substitutions=out.substitutions,
        insertions=out.insertions,
        deletions=out.deletions,
        hits=out.hits,
    )


# ============================ L2 grouping + DP =================================


def group_key(interval: Interval, *, attribute: str | None) -> GroupKey:
    if attribute is None:
        return (interval.label, None)
    val = interval.extra.get(attribute)
    return (interval.label, val if val not in (None, "") else None)


def group_intervals(
    intervals: Sequence[Interval], *, attribute: str | None
) -> dict[GroupKey, list[Interval]]:
    out: dict[GroupKey, list[Interval]] = defaultdict(list)
    for iv in intervals:
        out[group_key(iv, attribute=attribute)].append(iv)
    return out


def _join_group_text(intervals: Sequence[Interval], *, text_attr: str, separator: str) -> str:
    in_order = sorted(intervals, key=lambda iv: (iv.start, iv.id))
    parts = [iv.extra.get(text_attr, iv.text) or "" for iv in in_order]
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
        raw = iv.extra.get(text_attr, iv.text) or ""
        normed = normalizer(raw)
        norm_texts.append(normed)
        if is_char and flat_units and normed and inter_interval_sep:
            for ch in inter_interval_sep:
                flat_units.append(ch)
                origins.append(idx - 1)
        for tok in tokenize(normed, granularity):
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
    for idx, iv in enumerate(in_order):
        raw = iv.extra.get(text_attr, iv.text) or ""
        normed = normalizer(raw)
        norm_texts.append(normed)
        if chars and inter_interval_sep and normed:
            for ch in inter_interval_sep:
                chars.append(ch)
                origins.append(idx - 1)
        for ch in normed:
            chars.append(ch)
            origins.append(idx)
    return chars, origins, in_order, norm_texts


def _overlap_matrix(
    gt_intervals: Sequence[Interval], ds_intervals: Sequence[Interval]
) -> np.ndarray:
    if not gt_intervals or not ds_intervals:
        return np.zeros((len(gt_intervals), len(ds_intervals)), dtype=bool)
    g_start = np.array([iv.start for iv in gt_intervals])
    g_stop = np.array([iv.stop for iv in gt_intervals])
    d_start = np.array([iv.start for iv in ds_intervals])
    d_stop = np.array([iv.stop for iv in ds_intervals])
    lo = np.maximum(g_start[:, None], d_start[None, :])
    hi = np.minimum(g_stop[:, None], d_stop[None, :])
    return hi > lo


def _overlap_constrained_align(
    ref_units: Sequence[str],
    ref_origins: Sequence[int],
    hyp_units: Sequence[str],
    hyp_origins: Sequence[int],
    overlap: np.ndarray,
) -> tuple[list[AlignmentEdit], int, int, int, int, int]:
    """Levenshtein DP that forbids match/substitute between tokens whose source
    intervals do not temporally overlap.

    Returns (edits, hits, substitutions, insertions, deletions, boundaries).
    Boundary count is always 0 here; boundary edits are emitted only by
    `_reconstruct_word_edits_from_chars` on top of a char-level alignment.
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
                    mc = cost[i - 1, j - 1]
                    if mc < best:
                        best, op = mc, MATCH
                else:
                    sc = cost[i - 1, j - 1] + 1
                    if sc < best:
                        best, op = sc, SUB

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
            and edits[-1].ref_end == r_s and edits[-1].hyp_end == h_s
        ):
            last = edits[-1]
            last.ref_end = r_e
            last.hyp_end = h_e
            last.ref_units += list(ref_units[r_s:r_e])
            last.hyp_units += list(hyp_units[h_s:h_e])
        elif (
            edits and edits[-1].op == EditOp.DELETE and op_name == EditOp.DELETE
            and edits[-1].ref_end == r_s
        ):
            edits[-1].ref_end = r_e
            edits[-1].ref_units += list(ref_units[r_s:r_e])
        elif (
            edits and edits[-1].op == EditOp.INSERT and op_name == EditOp.INSERT
            and edits[-1].hyp_end == h_s
        ):
            edits[-1].hyp_end = h_e
            edits[-1].hyp_units += list(hyp_units[h_s:h_e])
        else:
            edits.append(
                AlignmentEdit(
                    op=op_name,
                    ref_start=r_s, ref_end=r_e,
                    hyp_start=h_s, hyp_end=h_e,
                    ref_units=list(ref_units[r_s:r_e]),
                    hyp_units=list(hyp_units[h_s:h_e]),
                )
            )

    hits = sum(e.ref_end - e.ref_start for e in edits if e.op == EditOp.EQUAL)
    subs = sum(e.ref_end - e.ref_start for e in edits if e.op == EditOp.SUBSTITUTE)
    dels = sum(e.ref_end - e.ref_start for e in edits if e.op == EditOp.DELETE)
    ins = sum(e.hyp_end - e.hyp_start for e in edits if e.op == EditOp.INSERT)
    boundaries = sum(1 for e in edits if e.op == EditOp.BOUNDARY)
    return edits, hits, subs, ins, dels, boundaries


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
            if (
                not hyp_consumed[next_hyp_emit]
                and not hyp_will_be_used[next_hyp_emit]
            ):
                h_word = hyp_words[next_hyp_emit][2]
                ref_pos = word_edits[-1].ref_end if word_edits else 0
                word_edits.append(AlignmentEdit(
                    op=EditOp.INSERT,
                    ref_start=ref_pos, ref_end=ref_pos,
                    hyp_start=next_hyp_emit, hyp_end=next_hyp_emit + 1,
                    ref_units=[], hyp_units=[h_word],
                ))
                hyp_consumed[next_hyp_emit] = True
            next_hyp_emit += 1

    r = 0
    while r < n_ref_words:
        primary = ref_primary[r]
        dests = ref_dest_lists[r]
        r_word = ref_words[r][2]

        if primary is None:
            hyp_pos = word_edits[-1].hyp_end if word_edits else next_hyp_emit
            word_edits.append(AlignmentEdit(
                op=EditOp.DELETE,
                ref_start=r, ref_end=r + 1,
                hyp_start=hyp_pos, hyp_end=hyp_pos,
                ref_units=[r_word], hyp_units=[],
            ))
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
            word_edits.append(AlignmentEdit(
                op=EditOp.BOUNDARY,
                ref_start=r, ref_end=group_end + 1,
                hyp_start=primary, hyp_end=primary + 1,
                ref_units=group_ref_words, hyp_units=[h_word],
            ))
            r = group_end + 1
            next_hyp_emit = max(next_hyp_emit, primary + 1)
            continue

        if len(dests) > 1:
            hyp_word_strs = [hyp_words[hw][2] for hw in dests]
            first_hw, last_hw = dests[0], dests[-1]
            for hw in dests:
                hyp_consumed[hw] = True
            word_edits.append(AlignmentEdit(
                op=EditOp.BOUNDARY,
                ref_start=r, ref_end=r + 1,
                hyp_start=first_hw, hyp_end=last_hw + 1,
                ref_units=[r_word], hyp_units=hyp_word_strs,
            ))
            next_hyp_emit = max(next_hyp_emit, last_hw + 1)
        else:
            h_word = hyp_words[primary][2]
            hyp_consumed[primary] = True
            op = EditOp.EQUAL if r_word == h_word else EditOp.SUBSTITUTE
            word_edits.append(AlignmentEdit(
                op=op,
                ref_start=r, ref_end=r + 1,
                hyp_start=primary, hyp_end=primary + 1,
                ref_units=[r_word], hyp_units=[h_word],
            ))
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


def align_group_via_chars(
    gt_intervals: Sequence[Interval],
    ds_intervals: Sequence[Interval],
    *,
    text_attr: str,
    normalizer: Normalizer,
    separator: str = " ",
) -> AlignmentResult:
    """Char-level overlap-constrained alignment with word-level edit
    reconstruction. Resulting AlignmentResult looks like a word-mode
    alignment from the caller's perspective.

    Spaces are just characters in the char-level DP, so any N-to-M
    boundary disagreement is captured naturally and reclassified as a
    `boundary` edit when reconstructing the word view.
    """

    ref_chars, ref_origins, gt_sorted, ref_norm_parts = _normalize_to_chars_per_interval(
        gt_intervals, text_attr=text_attr, normalizer=normalizer, inter_interval_sep=separator,
    )
    hyp_chars, hyp_origins, ds_sorted, hyp_norm_parts = _normalize_to_chars_per_interval(
        ds_intervals, text_attr=text_attr, normalizer=normalizer, inter_interval_sep=separator,
    )

    ref_norm_joined = separator.join(p for p in ref_norm_parts if p)
    hyp_norm_joined = separator.join(p for p in hyp_norm_parts if p)

    overlap = _overlap_matrix(gt_sorted, ds_sorted)

    if not ref_chars and not hyp_chars:
        return AlignmentResult(
            Granularity.WORD, ref_norm_joined, hyp_norm_joined,
            [], [], [], 0.0, 0, 0, 0, 0,
        )

    char_edits, _ch_hits, _ch_subs, _ch_ins, _ch_dels, _ = _overlap_constrained_align(
        ref_chars, ref_origins, hyp_chars, hyp_origins, overlap,
    )

    ref_word_strs, hyp_word_strs, word_edits = _reconstruct_word_edits_from_chars(
        ref_chars, hyp_chars, char_edits,
    )

    n_ref_words = len(ref_word_strs)
    hits = sum(e.ref_end - e.ref_start for e in word_edits if e.op == EditOp.EQUAL)
    subs = sum(e.ref_end - e.ref_start for e in word_edits if e.op == EditOp.SUBSTITUTE)
    dels = sum(e.ref_end - e.ref_start for e in word_edits if e.op == EditOp.DELETE)
    ins = sum(e.hyp_end - e.hyp_start for e in word_edits if e.op == EditOp.INSERT)
    boundaries = sum(1 for e in word_edits if e.op == EditOp.BOUNDARY)
    wer = (subs + ins + dels + boundaries) / n_ref_words if n_ref_words else float("nan")

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
        wer=wer,
        substitutions=subs,
        insertions=ins,
        deletions=dels,
        hits=hits,
        ref_origins=ref_word_origins,
        hyp_origins=hyp_word_origins,
    )


def align_group_with_overlap(
    gt_intervals: Sequence[Interval],
    ds_intervals: Sequence[Interval],
    *,
    text_attr: str,
    granularity: Granularity,
    normalizer: Normalizer,
    separator: str,
) -> AlignmentResult:
    """G2-join alignment that forbids token-level matches between intervals
    whose time spans don't overlap. Catches the most obvious spurious matches
    (e.g. "police" at t=24s ↔ "police" at t=180s)."""

    ref_units, ref_origins, gt_sorted, ref_norm_parts = _normalize_tokenize_per_interval(
        gt_intervals, text_attr=text_attr, normalizer=normalizer,
        granularity=granularity, inter_interval_sep=separator,
    )
    hyp_units, hyp_origins, ds_sorted, hyp_norm_parts = _normalize_tokenize_per_interval(
        ds_intervals, text_attr=text_attr, normalizer=normalizer,
        granularity=granularity, inter_interval_sep=separator,
    )

    ref_norm_joined = separator.join(p for p in ref_norm_parts if p)
    hyp_norm_joined = separator.join(p for p in hyp_norm_parts if p)

    if not ref_units and not hyp_units:
        return AlignmentResult(granularity, ref_norm_joined, hyp_norm_joined,
                               [], [], [], 0.0, 0, 0, 0, 0)
    if not ref_units:
        return AlignmentResult(
            granularity, ref_norm_joined, hyp_norm_joined, [], list(hyp_units),
            [AlignmentEdit(EditOp.INSERT, 0, 0, 0, len(hyp_units), [], list(hyp_units))],
            float("inf"), 0, len(hyp_units), 0, 0,
        )
    if not hyp_units:
        return AlignmentResult(
            granularity, ref_norm_joined, hyp_norm_joined, list(ref_units), [],
            [AlignmentEdit(EditOp.DELETE, 0, len(ref_units), 0, 0, list(ref_units), [])],
            1.0, 0, 0, len(ref_units), 0,
        )

    overlap = _overlap_matrix(gt_sorted, ds_sorted)
    edits, hits, subs, ins, dels, boundaries = _overlap_constrained_align(
        ref_units, ref_origins, hyp_units, hyp_origins, overlap,
    )
    wer = (subs + ins + dels + boundaries) / len(ref_units)
    return AlignmentResult(
        granularity=granularity,
        ref_normalized=ref_norm_joined,
        hyp_normalized=hyp_norm_joined,
        ref_units=list(ref_units),
        hyp_units=list(hyp_units),
        edits=edits,
        wer=wer,
        substitutions=subs,
        insertions=ins,
        deletions=dels,
        hits=hits,
        ref_origins=list(ref_origins),
        hyp_origins=list(hyp_origins),
    )


# ============================ L2 entry point ==================================


def run_transcription_qe(
    gt: AnnotationSet, ds: AnnotationSet, req: TranscriptionRequirement
) -> TranscriptionReport:
    normalizer = Normalizer(req.normalizer)

    gt_groups = group_intervals(gt.intervals, attribute=req.grouping.attribute)
    ds_groups = group_intervals(ds.intervals, attribute=req.grouping.attribute)

    groups: list[GroupAlignment] = []
    missing: list[tuple[GroupKey, list[Interval]]] = []
    extra: list[tuple[GroupKey, list[Interval]]] = []
    pairs: list[FilterPairAlignment] = []
    pair_gt_u: list[Interval] = []
    pair_ds_u: list[Interval] = []

    all_keys = set(gt_groups) | set(ds_groups)

    if req.grouping.strategy == GroupingStrategy.JOIN:
        for key in sorted(all_keys, key=lambda k: (k[0], k[1] or "")):
            gt_g = gt_groups.get(key, [])
            ds_g = ds_groups.get(key, [])
            if not gt_g:
                extra.append((key, ds_g))
                continue
            if not ds_g:
                missing.append((key, gt_g))
                continue
            if req.enforce_overlap:
                if req.align == AlignMode.CHAR and req.granularity == Granularity.WORD:
                    alignment = align_group_via_chars(
                        gt_g, ds_g,
                        text_attr=req.text_attribute,
                        normalizer=normalizer,
                        separator=req.grouping.join_separator,
                    )
                elif req.align == AlignMode.WORD and req.granularity == Granularity.WORD:
                    alignment = align_group_with_overlap(
                        gt_g, ds_g,
                        text_attr=req.text_attribute,
                        granularity=Granularity.WORD,
                        normalizer=normalizer,
                        separator=req.grouping.join_separator,
                    )
                else:
                    alignment = align_group_with_overlap(
                        gt_g, ds_g,
                        text_attr=req.text_attribute,
                        granularity=req.granularity,
                        normalizer=normalizer,
                        separator=req.grouping.join_separator,
                    )
            else:
                ref_text = _join_group_text(
                    gt_g, text_attr=req.text_attribute, separator=req.grouping.join_separator
                )
                hyp_text = _join_group_text(
                    ds_g, text_attr=req.text_attribute, separator=req.grouping.join_separator
                )
                alignment = align_pair(
                    ref_text, hyp_text, granularity=req.granularity, normalizer=normalizer
                )
            groups.append(GroupAlignment(key, gt_g, ds_g, alignment))

    else:  # filter
        for key in sorted(all_keys, key=lambda k: (k[0], k[1] or "")):
            gt_g = gt_groups.get(key, [])
            ds_g = ds_groups.get(key, [])
            matches, _, gt_u, ds_u = _two_stage_match(
                gt_g, ds_g, iou_thresh=req.iou_threshold
            )
            for a, b in matches:
                ref_t = a.extra.get(req.text_attribute, a.text)
                hyp_t = b.extra.get(req.text_attribute, b.text)
                pairs.append(
                    FilterPairAlignment(
                        gt=a, ds=b, iou=iou(a, b),
                        onset_delta=b.start - a.start,
                        offset_delta=b.stop - a.stop,
                        alignment=align_pair(
                            ref_t, hyp_t,
                            granularity=req.granularity, normalizer=normalizer,
                        ),
                    )
                )
            pair_gt_u.extend(gt_u)
            pair_ds_u.extend(ds_u)

    return TranscriptionReport(
        requirement=req,
        groups=groups,
        missing_groups=missing,
        extra_groups=extra,
        pairs=pairs,
        pair_gt_unmatched=pair_gt_u,
        pair_ds_unmatched=pair_ds_u,
    )
