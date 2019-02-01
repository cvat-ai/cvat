exports.settings = {bullet: '*', paddedTable: false}

exports.plugins = [
  require('remark-preset-lint-recommended'),
  require('remark-preset-lint-consistent'),
  require('remark-validate-links'),
  [require("remark-lint-no-dead-urls"), { skipOffline: true }],
  [require("remark-lint-maximum-line-length"), 120],
  [require("remark-lint-maximum-heading-length"), 120],
  [require("remark-lint-list-item-indent"), "tab-size"],
  [require("remark-lint-list-item-spacing"), false],
  [require("remark-lint-strong-marker"), "*"],
  [require("remark-lint-emphasis-marker"), "_"],
  [require("remark-lint-unordered-list-marker-style"), "-"],
  [require("remark-lint-ordered-list-marker-style"), "."],
]
