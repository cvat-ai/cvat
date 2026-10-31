---
title: 'Engineering guidelines'
linkTitle: 'Engineering guidelines'
weight: 4
description: 'Principles and project agreements for writing and reviewing CVAT code.'
---

These guidelines apply to all code in the repository, regardless of whether a person
or an AI agent wrote it. Formatting is enforced by linters (see [Coding style](/docs/contributing/coding-style/));
this page covers what linters cannot check.

Most of the rules are basic software engineering. They are written down because
the same issues keep coming up in reviews. The rules are defaults: deviate when you
have a reason, and state the reason.

Sources and references:

- S. McConnell, *Code Complete*, 2nd ed.
- [PEP 8](https://peps.python.org/pep-0008/), [PEP 20](https://peps.python.org/pep-0020/),
  [PEP 257](https://peps.python.org/pep-0257/)
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
  (referenced as CG; the rules cited here apply beyond C++)
- [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
- DRY, SOLID, Occam's razor, the Pareto principle

## 1. Code is written for people

> Code is read much more often than it is written.
>
> — Guido van Rossum, as quoted in [PEP 8](https://peps.python.org/pep-0008/)

The typical reader is a colleague who lacks your current context — possibly you,
a year later. The primary technical goal is managing complexity (*Code Complete*).

- **Terse, but not terser.** Remove what repeats or what the reader does not need.
  Keep what they do need. Code that is short but must be decoded is not simple.
- **Express intent in code first** (CG P.1, P.3): names, types, structure.
  Comment only what the code cannot say: why, constraints, non-obvious consequences
  (*Code Complete*, ch. 32; CG NL.1, NL.2).
  Keep comments crisp (CG NL.3).
- **Docstrings describe the contract**: what the function does, what it expects,
  and what it guarantees.
- **One function — one logical operation** (CG F.2, F.3). Extract a long inline block
  into a named function. Prefer guard clauses to deep nesting.
  Separate logical steps with blank lines.
- **Names.** Use the established domain terms. Prefer specific words to overloaded
  ones (`instance`, `support`, `api`, `data`, `info`).
  - Established abbreviations are fine (`gt`, `iou`, `oks`, `roi`, `bbox`).
    Do not invent new ones and do not overuse them: dense abbreviations are clear
    while you write the code, and opaque some months later.
  - In CamelCase identifiers, write abbreviations as words: `HttpServerError`,
    `IouThreshold`, not `HTTPServerError`, `IoUThreshold`.

Example:

```python
# Before: explains why callers need the function
def key_with_prefix(self, key: str) -> str:
    """
    upload_file() and download_file() take a key as is and have no way to tell
    whether it's already prefixed, so this exists for callers that...
    """

# After: states the contract
def key_with_prefix(self, key: str) -> str:
    """
    Resolve a user-supplied key relative to the configured prefix, if there is one.
    Both relative ("a/b.zip") and absolute ("/a/b.zip") keys are resolved relative to the prefix.
    """
```

It's not to say that the former docstring had no useful information. It had, and it could
be mentioned in the pull request description instead.

## 2. Avoid unverified information

A wrong comment is worse than none, because the reader trusts it. This applies to
comments, docstrings, documentation, test names, changelog entries, commit messages,
PR descriptions, and review replies.

- **Check every factual statement** about library or database behavior, performance,
  safety, compatibility, or "this cannot happen". Read the source, run the code,
  or cite the documentation. If you have not checked, say so explicitly — and do not
  put unchecked assumptions into code comments.
- **Treat received claims as hypotheses**, including reviewers' and tools' claims. Tools can have
  bugs. Reviewers may be tired or lack context about the specific problem you're
  solving.
- **Run the code where it actually runs**: the production database engine,
  both migration directions, with the required services started.
  Say what was checked in the PR description, ideally with results.
- **Measure before making performance claims**, and measure the baseline the same way.
- **Cite the source of magic values**: a link, preferably to a pinned version.
- **Name known gaps.** Mark them with `FIXME` / `TODO` and describe the concrete problem,
  instead of implying completeness.
- **Test names must match what the tests check.** A test named
  `test_can_update_primary_role_only` must also check that other fields cannot be updated.
- **Keep the surroundings true.** When code changes, update the nearby comments,
  docstrings, and docs in the same change.

Example: a migration used `Cast(..., FloatField())`. The SQL was rendered with the
test settings (SQLite) and showed `CAST(... AS real)`. From that, the author concluded
that PostgreSQL loses precision, replaced `Cast` with a hand-written `::double precision`
expression, and added a comment about the precision loss. On PostgreSQL, Django casts
`FloatField` to `double precision`; `real` is the SQLite type. One check of the
backend's type mapping would have prevented both the extra code and the wrong comment.

## 3. Every line has a reason

Do not multiply entities beyond necessity (Occam's razor).

- **Design from the use cases.** Check the actual use cases, consider the likely future
  changes and extensions, and build the design so that they fit without a rewrite.
  Implement what is needed now; design for what is likely next.
- **Be ready to answer "why?"** for every field, parameter, nullability, limit, branch,
  cache, and constant. If you cannot, remove it. If the reason is not obvious from
  the code, write it down.
- **Do not add what was not asked for**: features, formats, heuristics, settings,
  "just in case" checks.
- **Choose realistic limits.** "Do we know any realistic use cases for more than
  10 breakpoints?" is the first review question for a limit of 200.
- **Optimize measured bottlenecks only.** Drop an optimization for a rare case
  when the baseline is fine and the maintenance cost is not worth it.
- **Delete dead code.** Version control keeps it.
- **Apply the Pareto principle.** Solve the common case with a simple and reliable design;
  do not complicate it for rare corner cases. The exception is corner cases that crash
  the system or corrupt data.

## 4. Fit into the existing design

A common issue is a change added *next to* the existing code instead of *into* it.

- **Read the surroundings before changing code**: the neighboring lines, the class,
  the callers, the related docs. Update what your change makes outdated.
- **Use the existing abstractions**: helpers, constants, types, API shapes.
  Search before writing a new one.
- **Extend an existing abstraction instead of adding a parallel one.**
  Example: an object matcher took `iou_threshold: float`. A per-object threshold was added
  as a separate `gt_threshold` parameter, passed through two constructors, and it
  was also applied, by mistake, to a metric where it had no meaning. The fix was to widen
  the existing parameter: `iou_threshold: float | GtThresholdFunction`.
  The server API already used the same design.
- **When a new abstraction replaces an existing one**, migrate the existing uses to it,
  so that the two do not coexist. If the migration is big, consider moving it into a separate PR.
- **Prefer the canonical solution**: the standard library, the framework feature,
  an existing dependency (CG SL.1). Write your own only for a confirmed reason,
  such as a bug or a spec deviation, and document it in a comment.
  Example: DRF's `FloatField(min_value=0, max_value=1)` accepts `True` (as `1.0`)
  and `"nan"`, so the feature uses a custom field with a comment explaining why.
- **Put code where it belongs**: an extra quality control check goes to the quality control package,
  an event handler goes to event handlers. Check for the existing locations first.
- **DRY: one source of truth** for each value, list, and definition. Build help texts
  and error messages from the enum instead of copying its values.
  DRY is about knowledge, not about similar-looking code: do not merge two things
  that only coincide. Coinciding entities may differ in nature.
- **SOLID, applied pragmatically.**
  - Single responsibility: a class or function should have a limited scope of responsibility.
    A function that handles UI presentation, DB access optimizations, and domain logic
    should probably be split.
  - Open–closed: adding a variant should not require changing the generic base class.
    For a fixed set of variants, a type enum is the default approach.
    Use a registry when the set is dynamic (e.g. plugins).
    Express optional capabilities in types (a base class, a mixin, a `Protocol`) and
    declared properties, not with `hasattr` probes in generic code.
  - Liskov substitution: a subclass keeps the base class contract, if the classes are supposed
    to be used in generic code.
  - Interface segregation: keep interfaces focused on the use cases. Avoid putting everything in the
    same interface. Avoid methods that are not applicable and cannot be implemented by some
    subclasses: a base interface for all annotation types must not mention frames or 2D area.
  - Dependency inversion: generic code depends on interfaces, not on concrete
    implementations. Implementations depend on abstractions.
    A generic object matcher must not hardcode one metric's constant. Keep domain models
    separate from implementations, even when their values coincide today.
- **Prefer general, extensible solutions** to one-off special cases, unless the task is
  inherently narrow (e.g. optimizing a specific operation). Generality is about structure;
  it does not justify extra options (see section 3).
- **Stay consistent with sibling code.** When fixing one path, check the analogous
  ones (e.g. export and import) and the same option in other media types.
  Sibling helpers should have the same signature shape.

## 5. Types and constants

- **Use enums or named constants instead of raw strings and magic numbers**
  (CG ES.45, Enum.1). The main reason: type checkers, linters, and IDEs then catch
  mistakes, instead of a typo becoming a latent bug (CG P.5). A typo in an enum name fails
  at the first use, or earlier in the IDE; a typo in a string fails silently.
- **When branching on an enum**, list the handled values in a `match` and add
  a failing default, so that a new enum value cannot silently fall into some branch:

  ```python
  match task.dimension:
      case DimensionType.DIM_2D:
          ...
      case DimensionType.DIM_3D:
          ...
      case _:
          raise AssertionError(f"Unexpected dimension {task.dimension}")
  ```

- **Add type hints to the functions you add or change.** Exceptions: local closures,
  and types that are hard to express (see `Any` below).
- **Make interfaces precisely typed** (CG I.4). Annotate with what callers actually pass:
  a specific type, a union of the expected types, or a generic type.
  - Describe duck typing with a `Protocol` instead of `hasattr` checks (except Django models).
  - Use `Any` when the type is unknown or hard to express (e.g. some Django models
    and views). Do not use `object` as an annotation for that.
  - A parameter is optional only when calling without it makes sense.
- **Import at the module level.** A function-local import is a non-default solution, e.g. for
  breaking an import cycle. It needs a comment.

## 6. Errors and invariants

Use assertions for conditions that must never occur, and error handling for conditions
that can (*Code Complete*, "Defensive Programming").

- **Fail fast, fail loudly**: an unreachable code path must fail immediately and visibly
  ([J. Shore, "Fail Fast", IEEE Software, 2004](https://martinfowler.com/ieeeSoftware/failFast.pdf)).
  Follow the conventions of the component.
  On the server, use `assert` or raise `AssertionError`, not `ValueError`
  (it suggests invalid input).
- **Do not re-check invariants** that types or callers already guarantee.
- **Validate inputs once, at the boundary**: the API layer, the constructor.
- **Errors should never pass silently** (PEP 20): no silent `return`, no broad `except`,
  no `value || 0` hiding a missing value. Pass `null` through and let the consumer decide.
- **Data that users can produce** (e.g. an annotation outside the image) must not
  break the operation; degrade gracefully (e.g. skip the annotation export, but report it).
- **Handle degenerate inputs explicitly** (empty arrays, zero denominators), with
  a comment on when they happen.
- **Error messages** state what happened, why, and what to do.
- **Retry only errors that a retry can fix.**

## 7. Private and undocumented APIs

- Do not use private APIs: names with a leading underscore, undocumented functions
  and attributes, including undocumented internals of public libraries.
  If there is no alternative, isolate the call (CG P.11) and add a comment explaining
  why it is needed and what could break it (e.g. a library upgrade).
- In our own code, add a public method or property instead of reaching into
  another class's private members.
- Tests use public APIs too (see below).

## 8. Tests

- **Arrange, Act, Assert**: keep the three parts visibly separate.
- **Test behavior through the public API.** Do not test private methods.
  Unit tests with mocks are a fallback: for cases where an API test is too slow,
  or where specific implementation details have to be checked.
- **Keep tests fast.**
- **One case per test**, named after the behavior it checks. A common naming pattern
  is `test_can_X`.
- **Parametrize only over dimensions the behavior depends on.** Extra dimensions
  multiply the run time and hide the intent.
- **Use a few representative, hand-checkable values** with an `assert` for their
  preconditions, instead of exhaustive loops.
- **Do not let tests affect each other through shared data.** A test that modifies data
  can create its own when that is cheap. When it is expensive — slow (e.g. creating
  a task) or hard to implement (e.g. masks through the API) — add a shared reusable
  fixture instead.
- **Drive the real pipeline** instead of setting the DB state directly.
- **No fixed delays.** Do not use fixed sleeps for synchronization; wait for a condition.
- **Test what a reasonable implementation could break.** "Would you naturally add
  such a test if this component was developed from scratch?" To cover a known
  implementation problem (e.g. a library bug), test the regular use case that it breaks,
  not the library itself.
- **Assert the configuration a test relies on**, so it cannot pass vacuously.
- **Regression tests link the issue or PR.**
- **Update existing tests** instead of deleting them.

## 9. Changes, commits, and pull requests

- **A PR proposes changes against its parent branch, nothing more.** Once a PR is
  published, the intermediate states of its work branch do not exist for anyone else.
  Do not add backward compatibility with earlier commits of the same branch, and do not
  describe the branch's development process in code, comments, docs, or the changelog.
  The rare exception is several people building on each other's unmerged branches.
- **One PR — one purpose.** Move unrelated fixes to a separate PR or leave a `TODO`.
  But do fix the same problem in sibling code paths.
- **Keep PRs reviewable**: aim for under 1000 changed lines of implementation,
  excluding tests and assets.
  - Small refactorings can be included.
  - Extract big refactorings and preparatory changes (e.g. generalizing an existing
    abstraction for a feature) into a separate PR that the feature PR depends on.
  - A dependent PR names its dependency in the first line of the description.
- **Split commits by logical change** before publishing a PR: refactoring before
  the feature, generated files after the sources.
- **Avoid rebasing after the review has started**: it breaks the reviewer's view of
  what changed since the last review. There can be exceptions.
- **Commit messages** explain what was wrong and why the code changed.
- **PR descriptions** state what the change delivers and why, how it was tested,
  and what was not tested.
- **Changelog entries** describe the user-visible effect, not the implementation,
  and link the real PR.
- **When proposing a design**, list the alternatives with their downsides,
  quantify where possible, and state uncertainty explicitly.

## 10. CVAT agreements

### Server

- Regenerate `cvat/schema.yml` after server API changes. It can be done via the VS Code
  launch configuration `server: Generate REST API Schema` or manually. Remember to check
  the results and remove the `.devNNN` suffix from the version.
- Server tests: the default place is `tests/python` (pytest, REST API tests against
  a running server). Check how long the new tests take. Use the Django unit tests in
  `cvat/apps/<app>/tests/` (`ApiTestBase`) as a fallback: when the pytest tests are
  too slow, when mocks are needed, or when implementation details have to be checked.
- Performance of API endpoints and migrations: check on PostgreSQL with 1–5M+ relevant
  rows (top-level objects such as projects or tasks, with their child objects).
- Bulk DB operations: batch by 1–5k rows.

### Migrations

- Backfill new fields. Provide a working backward migration.
- Never delete data unless it is proven to be unused. Prefer refusing with instructions
  for the user.
- Touch only the affected rows, in batches. Prefer bulk operations.
- Avoid using DB provider-specific features, unless necessary. CVAT currently uses
  PostgreSQL and SQLite (in tests).
- Consider squashing new migrations before publishing or merging a PR. It can help with
  optimizing performance and reducing migration noise.

### Version control

- The project is located on GitHub at <https://github.com/cvat-ai/cvat>.
- Pull requests are merged by squashing by default.
- Proprietary code does not belong in the OSS repository (this one).

### Licensing

- Remember to add license headers to the new code files, where applicable.
  The project is licensed under the MIT license
  ([LICENSE](https://github.com/cvat-ai/cvat/blob/develop/LICENSE)); the header references it
  by its SPDX identifier:

  ```python
  # Copyright (C) CVAT.ai Corporation
  #
  # SPDX-License-Identifier: MIT
  ```

  In JS/TS files, use the same text with `//` comments.

## Conclusion

**Be consistent.** Follow the style of the surrounding code, but also
**be deliberate about the code** you write. Consistency is not a reason to keep an old style
without considering the benefits of a newer one ([Google Python Style Guide](https://google.github.io/styleguide/pyguide.html#4-parting-words)).
