# CVAT（本仓库）本地 Docker 启动与使用说明（中文）

这份说明面向“不会用 CVAT”的使用者，按步骤做即可跑起来并登录使用。

## 1. 你需要准备什么

- Windows + Docker Desktop（已安装并能正常运行）
- 本仓库代码：`D:/OneDrive/steven/code/5/cvat-develop`

> 注意：如果你之前把 CVAT 的容器“暂停（pause）”，端口仍然会被占用；要释放端口请用“停止（stop）”。

## 2. 一键启动（推荐）

在仓库根目录打开 PowerShell，执行：

```powershell
cd "D:/OneDrive/steven/code/5/cvat-develop"
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

查看运行状态：

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
```

## 3. 打开页面与登录

- 打开：`http://localhost:8080`
- 默认登录（本环境常用）：用户名 `admin`，密码 `admin123`

如果页面打不开：
- 先跑一次 `docker compose ... ps` 看 `traefik` / `cvat_ui` 是否 `Up`
- 再看日志：
  ```powershell
  docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail 100 cvat_ui
  docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail 200 cvat_server
  ```

## 4. 停止 / 重新启动（不删除数据）

停止（保留容器与卷）：
```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml stop
```

再次启动：
```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml start
```

如果你改了代码/配置，想“强制重建并替换容器”：
```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --force-recreate
```

## 5. 重新构建镜像（你改了代码时）

只重建 UI 和 Server（更快）：
```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml build cvat_ui cvat_server
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --force-recreate cvat_ui cvat_server
```

全量重建（最慢）：
```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml build
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --force-recreate
```

## 6. 常见问题排查

### 6.1 端口冲突（尤其是 5432）

如果启动报错提示端口被占用（例如 `127.0.0.1:5432`）：
- 先确认本机是否有 PostgreSQL/其他服务占用 5432
- 或者先把旧的 CVAT 栈 stop 掉（pause 不行）

### 6.2 后端脚本报 “python3\\r”

这是 Windows 的 CRLF 行尾导致 Linux 容器 shebang 解析失败的典型症状。
本仓库已在 `Dockerfile` 里做了容器内的行尾修复；如果你仍看到类似错误，优先重新 `build cvat_server` 并 `up -d --force-recreate cvat_server`。

### 6.3 Docker CLI 卡住 / 无响应

通常是 Docker Desktop 没完全起来或后端卡住：
- 打开 Docker Desktop 确认处于 Running
- 必要时重启 Docker Desktop 后再执行 `docker compose ... up -d`

