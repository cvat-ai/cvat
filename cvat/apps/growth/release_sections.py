# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Filter Hugo-rendered release sections without interpreting Markdown syntax."""

from html import escape

from lxml import etree, html

EDITIONS = ("community", "enterprise", "saas")


def _parse(body):
    try:
        root = html.fragment_fromstring(
            body, create_parent="div", parser=html.HTMLParser(no_network=True)
        )
    except etree.LxmlError as exc:
        raise ValueError("Invalid rendered release sections") from exc
    sections = root.xpath(".//section[@data-cvat-editions]")
    if not sections:
        raise ValueError("Expected rendered release sections")
    for section in sections:
        editions = section.get("data-cvat-editions").split(",")
        if (
            not editions
            or any(value not in EDITIONS for value in editions)
            or len(set(editions)) != len(editions)
        ):
            raise ValueError("Invalid release section audience")
        if any(parent.get("data-cvat-editions") is not None for parent in section.iterancestors()):
            raise ValueError("Release sections cannot be nested")
    return root, sections


def validate(body):
    _parse(body)
    return body


def for_edition(body, edition):
    root, sections = _parse(body)
    matching = False
    for section in sections:
        if edition in section.get("data-cvat-editions").split(","):
            matching = True
            # Availability is useful in the complete docs article; the popup
            # already contains only the current edition's content.
            for label in section.xpath("./p[@data-cvat-availability]"):
                label.drop_tree()
            del section.attrib["data-cvat-editions"]
        else:
            # Keep surrounding shared text and whitespace when removing a section.
            section.drop_tree()
    if not matching:
        return None
    # The synthetic parent is not part of the exported content.
    return escape(root.text or "") + "".join(
        html.tostring(child, encoding="unicode", with_tail=True) for child in root
    )
