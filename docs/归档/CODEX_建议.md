# CODEX 汉化执行建议（给协作代理）

目标：对 `cvat-ui` 做“硬编码汉化”（直接替换 TS/TSX 中用户可见字符串），不引入 i18n，不改架构。

## 开工前

- 先读：`docs/汉化手册.md`（规则/术语/验证）
- 先看：`docs/汉化对照总表.md`（英文→中文统一口径）
- 修改范围优先：`cvat-ui/src/components`、`cvat-ui/src/reducers`

## 替换原则（必须）

- 只翻译用户可见文本：按钮/标题/Label/Tooltip/Empty 文案/notification/message 等。
- 保留占位符与语法：`${...}`、`{...}`、`{{...}}`、URL、HTML/JSX 结构不能破坏。
- 不改变量/枚举/类型名（如 `TargetMetric`、`Settings` 作为标识符的情况）。
- 统一术语：Projects=项目，Tasks=任务，Jobs=作业，Cloud Storage=云存储，Settings=设置，Logout=退出登录。

## 快速扫漏（推荐命令）

- 扫 `label/title/placeholder` 里的英文：
  - `rg -n -S 'label=[\"\\x27][A-Za-z]|placeholder=[\"\\x27][A-Za-z]|title=[\"\\x27][A-Za-z]|Tooltip\\s+title=[\"\\x27][A-Za-z]' cvat-ui/src/components`
- 扫明显英文 Text 节点（粗筛）：
  - `rg -n -S '>\\s*[A-Za-z][A-Za-z0-9 \\-_/]{2,}\\s*<' cvat-ui/src/components --glob \"*.tsx\"`

## 验证闭环（不要卡在 Docker）

- 本地构建：`yarn run build:cvat-ui`
- Docker `docker compose build cvat_ui` 可能因 `auth.docker.io` 超时失败；非必要不使用它做验证。

## 产出要求

- 每次新增的英文→中文映射，补到 `docs/汉化对照总表.md` 的“补充”小节，避免口径漂移。
- 提交前（本地）保证 `yarn run build:cvat-ui` 通过。

