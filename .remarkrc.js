exports.settings = { bullet: '*', paddedTable: false };

exports.plugins = [
    'remark-preset-lint-recommended',
    'remark-preset-lint-consistent',
    ['remark-preset-lint-markdown-style-guide', 'mixed'],
    ['remark-lint-no-dead-urls', { skipOffline: true }],
    ['remark-lint-maximum-line-length', 120],
    ['remark-lint-maximum-heading-length', 120],
    ['remark-lint-strong-marker', '*'],
    ['remark-lint-emphasis-marker', '_'],
    ['remark-lint-unordered-list-marker-style', '-'],
    ['remark-lint-ordered-list-marker-style', '.'],
    ['remark-lint-no-file-name-irregular-characters', false],
    ['remark-lint-list-item-spacing', false],
];
