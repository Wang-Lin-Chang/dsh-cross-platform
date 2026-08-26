# dsh-cross-platform

> **Part of the [DSH plugin suite](https://github.com/Wang-Lin-Chang)** — six Apache-2.0 plugins for DeepSeek Harness. · DSH 插件套件之一：六个 Apache-2.0 插件。

> dsh-witness / dsh-anchor 的 Linux 后端：Linux 沙箱配方 + 进程身份工具——**每个能力声明都带实验编号与对照组**。（macOS 版见 [dsh-macos](https://github.com/Wang-Lin-Chang/dsh-macos)。）

English: [README.md](./README.md)。

[![license](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![ci](https://github.com/Wang-Lin-Chang/dsh-cross-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/Wang-Lin-Chang/dsh-cross-platform/actions/workflows/ci.yml)
[![topic: dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-4d6bfe)](https://github.com/topics/dsh-plugin)
[![topic: dsh](https://img.shields.io/badge/topic-dsh-4d6bfe)](https://github.com/topics/dsh)

## 为什么有它 / Why

dsh-witness 的 Windows 沙箱（NTFS ACL 六维闭合）在 Linux 上需要等价物。本包把 Linux 的沙箱配方验证成了有实测背书的组件：

| 能力 | Linux 配方 | 实验判决 |
|---|---|---|
| 防覆盖 | `chattr +i` + bubblewrap 只读视图 | EXP-1 / EXP-3（带对照组）|
| 防删 | `chattr +i` + 只读视图 | EXP-1 / EXP-3 |
| 防伪造（lock/exit.txt）| `chattr +i` | EXP-1 / 冒烟 12/12 |
| 文件系统隔离 | **bubblewrap 只读视图（EROFS）**——宿主与任务看到两个视图 | EXP-3 |
| 进程身份（三证据）| `/proc/<pid>/stat` 第 22 字段 + btime | EXP-6 |
| 退出协议 | `EXIT:<code>`（对齐 Windows）| 冒烟 12/12 |
| 官方配方 | Node `--experimental-permission` | EXP-2 |

## 实验账本 / Experiments

全部实验在 `EXPERIMENTS.md`：9 项判决，每项带对照组（假阳性排除）。核心战果：

- **Witness 12 项验收 · Linux 版：34/34 ×3 连跑稳定**（`test/witness-final-linux-test.ts`）
- dsh-anchor Linux 全测试：37/37（P1-P4，零代码改动）
- Linux runner 冒烟：12/12（正常任务/沙箱攻击/bwrap 模式）

## 组件 / Components

```
src/
├── detach-runner-linux.cjs   # 任务 runner（bash 托管 + 双模式沙箱，协议全对齐 Windows）
├── linux-backend.mjs         # 沙箱后端（chattr 应用/校验/恢复 + 能力自述）
└── linux-utils.mjs           # /proc 启动时间 + 进程存活 + 退出码协议
```

## 快速开始 / Quick start

```sh
# 安装（git 源，固定 tag——npm 发布前的安装方式）
dsh plugin --profile <name> add "github:Wang-Lin-Chang/dsh-cross-platform#v0.1.0"
```

```ts
import { LinuxSandboxBackend } from 'dsh-cross-platform'

const backend = new LinuxSandboxBackend('/path/to/job-dir')
backend.apply()        // chattr +i 证据文件（任务 spawn 前）
backend.verify()       // fail-closed 自校验（对齐 Windows EXIT:-998 语义）
backend.restore()      // 任务死后恢复（registry 终态落盘窗口）
```

Runner 直接用法（与 Windows detach-runner.cjs 同协议）：

```sh
node detach-runner-linux.cjs <jobDir> <outFile> <exitFile> <commandBase64> [bwrap]
```

## 诚实边界 / Honest boundaries

- **Linux 实测环境**：WSL2 Ubuntu 26.04 LTS（内核 6.6）+ Node 25.8.1。其他发行版/内核未实测不声称。
- **非 bwrap 降级模式**：out.log 不防任务写（`chattr +i` 挡一切写含预开句柄——EXP-8 架构判决）。landlock 补齐在路线图上（EXP 待做）。
- **macOS**：由 [dsh-macos](https://github.com/Wang-Lin-Chang/dsh-macos) 承担——sandbox-exec deny 视图 + uchg（12 项验收 34/34）。
- **离线适用面**：沙箱机制全部为本地系统调用（chattr/bwrap），无网络组件；数天级断网长跑未实测，不声称。
- **bwrap 挂载顺序是真相源顺序**（EXP-9 教训）：`ro-bind / → tmpfs /tmp → ro-bind jobDir`。

## 开发 / Development

```sh
npm test   # 12 项验收 Linux 版（需 bubblewrap；见 EXPERIMENTS.md 环境准备）
```

## License

Apache-2.0
