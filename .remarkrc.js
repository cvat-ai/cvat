exports.settings = { bullet: '*', paddedTable: false };

exports.plugins = [
    'remark-frontmatter',
    'remark-gfm',
    'remark-preset-lint-recommended',
    'remark-preset-lint-consistent',
    ['remark-lint-list-item-indent', 'space'],
    ['remark-lint-no-dead-urls', false], // Does not work because of github protection system
    ['remark-lint-maximum-line-length', 120],
    ['remark-lint-maximum-heading-length', 120],
    ['remark-lint-strong-marker', '*'],
    ['remark-lint-emphasis-marker', '_'],
    ['remark-lint-unordered-list-marker-style', '-'],
    ['remark-lint-ordered-list-marker-style', '.'],
    ['remark-lint-no-file-name-irregular-characters', false],
    ['remark-lint-list-item-spacing', false],
];
