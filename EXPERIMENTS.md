# Linux/macOS 沙箱配方实验记录（dsh-cross-platform）

> 节奏：本地实验 → 生产级实装 → 反复检查 → 最后开源

## 环境（已就绪）

- WSL2 Ubuntu 26.04 LTS（内核 6.6.87.2）+ Node 25.8.1（官方版，TS strip ✓）+ bubblewrap 0.11.1 + attr

## 实验判决汇总（全部有对照组）

### 1. chattr +i 不可变位 ✅（对照组排除假阳性）
+i 前可写可删 → +i 后覆盖/删除/rm -f 全挡 → -i 恢复。**挡的来源确证是 +i 本身**。

### 2. Node 官方权限模型 ✅
`--experimental-permission` 下写文件 BLOCKED:ERR_ACCESS_DENIED（无 --allow-fs-write）。

### 3. bwrap 命名空间隔离 ✅（Linux 反超 Windows 的关键）
- 沙箱内（--ro-bind / + --tmpfs /tmp + --unshare-all）：写 victim → **BLOCKED:EROFS**
- 对照组（无沙箱）：写成功 → 假阳性排除
- 文件完好
- **含义：任务进程的整个文件系统视图都是只读的——比逐文件 deny 更彻底**

### 4. landlock 内核支持 ✅（6.6 原生；调用级实测待补）
### 5. seccomp mode=2 ✅
### 6. /proc 启动时间公式 ✅
btime + starttime/100 ≈ now（差 1 秒 = 进程启动时刻）；字段解析 fields[19] = 字段 22 对齐验证。

### 7. dsh-anchor Linux 全测试 ✅✅
**37/37 全绿（P1 10 + P2 12 + P3 7 + P4 8）——与 Windows 完全一致，零代码改动**。锚点协议天生跨平台，现在有实测背书。

### 8. Linux runner 全链路冒烟 ✅✅ 12/12（detach-runner-linux.cjs v2）

| 场景 | 判决 |
|---|---|
| 正常任务 | 输出捕获（stdout+stderr）+ EXIT:0 + lock 删除 ✓ |
| 沙箱攻击（非 bwrap）| exit.txt 防删（+i）✓ + lock 防伪造（+i）✓ |
| 沙箱攻击（bwrap）| out.log 覆盖被挡（EROFS）✓ + 原始输出完好 ✓ + exit.txt 防删 ✓ |
| 非 bwrap 降级 | out.log 未防护（如实披露：覆盖成功+原始输出被毁——landlock 路线图解决）|

**架构级发现（EXP-8）**：chattr +i 挡一切写**含预开句柄**——Windows 的 open-before-deny 架构在 Linux 失效（runner 的 exitFd 写不进去）→ 时序重构：+i 只给 exit.txt/lock（runner 不写），out.log 靠 bwrap 只读视图（宿主与任务文件系统视图分离 = Linux 的 open-before-deny 等价物）。
**测试装置 bug（EXP-8b）**：exit.txt 复用目录 append 残留 → EXIT:0EXIT:0——runner 改 'w' 截断（协议文件每生命周期重写）+ 测试清目录。

### 9. Witness 12 项验收 · Linux 版 ✅✅✅ 34/34 ×3 连跑稳定

**Linux runner 通过 Windows 的 12 项验收回放——Anchor Core 平台无关性证明完成。**

- A 持久化 4 项 / B 收养协调 4 项（50 进程 O_EXCL 竞争）/ C 事件溯源 2 项 / D 沙箱边界 2 项（bwrap 只读视图）全过
- Windows 回归同步 100%（跨平台改动零破坏）
- 配套改动：WitnessJobRegistry 跨平台化（procStartSec 的 /proc 分支 + runner 按平台选择 + sandbox:'bwrap' 模式参数）

**D 组 bwrap 坑（EXP-9）**：任务目录在 /tmp 下被 `--tmpfs /tmp` 覆盖成空 → chdir 失败——修：挂载顺序 ro-bind / → tmpfs /tmp → **ro-bind jobDir（覆盖 tmpfs 空路径）**——目录在只读视图中可见。

## 生产代码状态（src/）

- `detach-runner-linux.cjs` v2 —— Linux 任务 runner（bash 托管 + 双模式沙箱 + 协议全对齐 Windows）
- `linux-backend.mjs` —— 沙箱后端（chattr/bwrap/能力自述带实验编号背书）
- `linux-utils.mjs` —— /proc 三证据 + 退出码协议

## 待做

- [x] dsh-witness Linux runner（detach-runner bash 分支 + SandboxBackend 接入）
- [x] bwrap 隔离模式实装进后端（spawn 包装）
- [x] 12 项验收 Linux 分步（A/B/C 组）——34/34 ×3 连跑稳定
- [x] macOS 实验——由 dsh-macos 承担（sandbox-exec deny 视图 + uchg，12 项验收 34/34）
- [ ] landlock 调用级实测（路线图，EXP 待做）
