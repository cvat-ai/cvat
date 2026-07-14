#!/usr/bin/env python3
"""Vectorize sustainlivework_transparent.png into CVAT brand assets.

The source is a raster lockup with no vector original, so glyphs are traced
with potrace. Colour split is by hue + darkness, not nearest-RGB-distance:

  - teal ink:  g > TEAL_G_FLOOR and r < TEAL_R_CEIL   (green-dominant hue)
  - black ink: r, g, b all < DARK_CEIL                (dark, and not teal)
  - otherwise: background (paper white, letter counters, faint fringe)

A first draft of this script classified by nearest-RGB-distance to
{black, teal, white}. That looks reasonable but is wrong: neutral greys
(r == g == b), which is exactly what black-on-white anti-aliasing produces,
sit surprisingly close to teal (0,179,148) in Euclidean RGB space for a wide
band of mid-grey values -- e.g. (128,128,128) is *closer* to teal than to
either black or white. That misclassified a thin grey halo around every
black glyph as teal, scattering hundreds of stray teal specks across the
whole canvas (visible once the favicon's bounding box, which is derived
from the teal mask, ballooned to cover the entire image instead of just the
"AI" glyph). The hue test above is immune to this: for any true grey
r == g == b, so "g > TEAL_G_FLOOR and r < TEAL_R_CEIL" can never both hold
(TEAL_G_FLOOR >= TEAL_R_CEIL), whatever the grey's brightness.

The white bucket still matters for a second reason independent of the above:
the source PNG encodes letter counters (the bowl of "S", the hole of "o" in
"Work") as *opaque* white pixels, not transparent ones. Treating "any
opaque, non-teal pixel" as black ink -- which the very first draft did --
fills those counters in solid, producing blobs instead of "S" and "o".

Alpha is otherwise binary in this source (0 or 255) except for a small
number of straggler opaque-white pixels well outside any glyph, which the
darkness test also correctly discards as background.
"""
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "sustainlivework_transparent.png"
TEAL = "#00B394"
BLACK = "#000000"

# Vertical bands of the stacked source lockup, in reading order.
BANDS = {"sustain": (0, 129), "liv": (181, 314), "work": (369, 502)}
ALPHA_FLOOR = 30  # ignore fully-transparent pixels
TEAL_G_FLOOR = 120  # green channel must clear this to read as teal hue
TEAL_R_CEIL = 120  # red channel must stay below this to read as teal hue
DARK_CEIL = 128  # all channels must stay below this to read as black ink

# potrace turns 1 source pixel into 10 path units (its "inches" scale
# times decipoint output); every crop we trace is scaled by SCALE and
# needs its flip translated by crop_height * SCALE accordingly.
POTRACE_UNIT = 10


def masks(img):
    """Split an RGBA image into (black_mask, teal_mask) as 1-bit images.

    See the module docstring for why this is a hue/darkness test rather
    than nearest-RGB-distance to {black, teal, white}.
    """
    black = Image.new("1", img.size, 0)
    teal = Image.new("1", img.size, 0)
    src, bp, tp = img.load(), black.load(), teal.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = src[x, y]
            if a <= ALPHA_FLOOR:
                continue
            if g > TEAL_G_FLOOR and r < TEAL_R_CEIL:
                tp[x, y] = 1
            elif r < DARK_CEIL and g < DARK_CEIL and b < DARK_CEIL:
                bp[x, y] = 1
            # else: background -- paper white, a letter counter, or a
            # near-white anti-aliasing fringe pixel.
    return black, teal


def trace(mask):
    """Run potrace over a 1-bit mask, returning its SVG path 'd' attributes."""
    if not mask.getbbox():
        return []
    with tempfile.TemporaryDirectory() as tmp:
        pbm, svg = Path(tmp) / "m.pbm", Path(tmp) / "m.svg"
        # potrace traces black-on-white, so invert: mask 1 -> black ink.
        Image.eval(mask, lambda v: 0 if v else 1).convert("1").save(pbm)
        subprocess.run(
            ["potrace", "-s", "-a", "1.0", "-O", "0.2", "-o", str(svg), str(pbm)],
            check=True,
            capture_output=True,
        )
        text = svg.read_text()
    return [seg.split('"', 1)[0] for seg in text.split(' d="')[1:]]


def flip(h):
    """Undo potrace's y-up coordinate space for a crop of pixel-height h.

    potrace's own SVG wraps paths in
      translate(0, h*UNIT/UNIT) scale(1/UNIT, -1/UNIT)   [in pt = px units]
    i.e. translate(0, h) scale(0.1, -0.1) applied to its decipoint path
    coords. We instead emit scale then translate (matrix-equivalent, just
    reordered) so it composes cleanly with an outer translate(x_off, 0)
    for horizontal layout: point' = scale(0.1,-0.1) . translate(0,-h*10).
    """
    return f"scale({1 / POTRACE_UNIT},{-1 / POTRACE_UNIT}) translate(0,{-h * POTRACE_UNIT})"


def group(mask, fill, transform):
    paths = "".join(f'<path d="{d}"/>' for d in trace(mask))
    if not paths:
        return ""
    return f'<g fill="{fill}" transform="{transform}">{paths}</g>'


def main():
    img = Image.open(SRC).convert("RGBA")
    black, teal = masks(img)

    # --- Horizontal wordmark: bands re-laid on one baseline ---
    GAP = 24  # px of whitespace between words, in source-pixel units
    parts, x_off, total_h = [], 0, 0
    for name, (top, bottom) in BANDS.items():
        h = bottom - top
        total_h = max(total_h, h)
        crops = {}
        for label, mask, fill in (("black", black, BLACK), ("teal", teal, TEAL)):
            crop = mask.crop((0, top, img.width, bottom))
            bbox = crop.getbbox()
            crops[label] = (crop, bbox, fill)
        # Left-trim the band by the leftmost ink across BOTH colour masks, so
        # the two masks keep their relative alignment within the word.
        lefts = [b[0] for _, b, _ in crops.values() if b]
        rights = [b[2] for _, b, _ in crops.values() if b]
        left, right = min(lefts), max(rights)
        for crop, bbox, fill in crops.values():
            if not bbox:
                continue
            band = crop.crop((left, 0, right, h))
            # Baseline-align: all three words sit on a shared baseline at
            # the bottom of the tallest band (Liv/Work run a few px taller
            # than SustAIn because their crop boxes include a dot-of-i /
            # ascender headroom the SustAIn band doesn't need). Top-aligning
            # instead would visibly drop the shorter word below the rest.
            y_off = total_h - h
            parts.append(
                group(band, fill, f"translate({x_off},{y_off}) {flip(h)}")
            )
        x_off += (right - left) + GAP
    width = x_off - GAP
    # NOTE on units: flip() already applies potrace's own *0.1 descale to
    # its decipoint path output, landing coordinates back in plain source-
    # pixel units (this mirrors potrace's own native SVG, which declares
    # its viewBox in plain pixel units too -- verified by tracing a sample
    # crop directly and reading its <svg width="...pt" viewBox="...">). So
    # the viewBox here must be declared in the SAME plain pixel units as
    # width/total_h, NOT divided by 10 again -- an earlier draft divided
    # by 10 here, which left the viewBox 10x smaller than the actual path
    # content and rendered as a single giant, clipped blob.
    # The header slot (cvat-ui/src/components/header/styles.scss) is
    # height:32px, max-width:128px, with the <img> using object-fit:contain,
    # so whichever of width/height is the binding constraint is decided by
    # the browser regardless of what we put here -- but the intrinsic
    # width/height attributes on the root <svg> should still describe the
    # SAME aspect ratio as the viewBox (this is how CVAT's own original
    # logo.svg does it: width="64" height="12" viewBox="0 0 80 15", a
    # matching 5.33:1 in both places). Mismatching them, as a hardcoded
    # width="128" height="24" would given this wordmark's ~9:1 aspect,
    # still renders correctly (browsers letterbox via preserveAspectRatio
    # rather than clip) but double-letterboxes and renders smaller than
    # necessary. Since 128px is the binding constraint here (128/9 < 32),
    # derive height from width so both boxes agree.
    header_w = 128
    header_h = round(header_w * total_h / width, 1)
    wordmark = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} '
        f'{total_h}" width="{header_w}" height="{header_h}">{"".join(parts)}</svg>'
    )
    out = ROOT / "cvat/apps/engine/static/logo.svg"
    out.write_text(wordmark)
    print(f"wrote {out} (viewBox {width}x{total_h}, ratio {width / total_h:.1f}x)")

    # --- Stacked lockup: the source as-is, for the login page ---
    stacked = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {img.width} {img.height}">'
        f'{group(black, BLACK, flip(img.height))}'
        f'{group(teal, TEAL, flip(img.height))}</svg>'
    )
    out = ROOT / "cvat-ui/src/assets/sustainlivwork-stacked.svg"
    out.write_text(stacked)
    print(f"wrote {out}")

    # --- Favicon: the teal AI mark alone, squared with padding ---
    bbox = teal.getbbox()
    mark = teal.crop(bbox)
    side = max(mark.size)
    pad = int(side * 0.12)
    canvas = Image.new("1", (side + 2 * pad, side + 2 * pad), 0)
    canvas.paste(
        mark,
        (pad + (side - mark.width) // 2, pad + (side - mark.height) // 2),
    )
    n = canvas.width
    favicon = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}">'
        f'{group(canvas, TEAL, flip(canvas.height))}</svg>'
    )
    out = ROOT / "cvat-ui/src/assets/favicon.svg"
    out.write_text(favicon)
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
