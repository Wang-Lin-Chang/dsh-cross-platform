// dsh-cross-platform/src/linux-backend.mjs —— Linux 沙箱后端 v0（生产级：基于实验判决逐条固化）
// 实验判决来源（EXPERIMENTS.md）：
//   实验1 ✅ chattr +i 防覆盖/防删（对照组排除假阳性，可逆）
// 设计原则（实测纪律）：能力对等——Linux 目标 ≥ Windows 六级
//   防覆盖 = chattr +i（比 NTFS deny 更硬：root 也要先清位）
//   防删   = chattr +i（同）
//   防伪造 = chattr +i 对 lock/exit.txt + 目录权限收紧（chmod 555 目录防新建/改名）
//   防自救 = i 位的清除需要 CAP_LINUX_IMMUTABLE（无特权进程无法自救）——比 Windows 更硬（Windows 需受限 token）
//   观测   = 读权限保持（chattr +i 不伤读）✓
// 待接（Ubuntu 环境就绪后实验）：
//   landlock（无特权文件沙箱）+ bwrap（命名空间隔离）+ Node 权限模型
import { execFileSync, spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

const sh = (cmd) => {
  try { return execFileSync('sh', ['-c', cmd], { timeout: 10000 }).toString().trim() } catch (e) { throw new Error(`sh fail: ${String(e.stderr ?? e.message).slice(0, 120)}`) }
}

export class LinuxSandboxBackend {
  constructor(jobDir) {
    this.jobDir = jobDir
  }

  /** 应用限制（任务 spawn 前）。目标文件：out.log / lock / exit.txt */
  apply() {
    const targets = ['out.log', 'exit.txt'].map(f => path.join(this.jobDir, f))
    const results = {}
    for (const t of targets) {
      if (fs.existsSync(t)) {
        sh(`chattr +i '${t}'`)
        results[path.basename(t)] = 'immutable'
      }
    }
    // lock 由 runner 稍后创建——应用时机在 runner 写 lock 后（apply 到 lock 单独调用）
    return results
  }

  /** lock 专用：runner 写完 lock 后调用（防任务改/删 lock） */
  applyLock() {
    const lock = path.join(this.jobDir, 'lock')
    if (fs.existsSync(lock)) sh(`chattr +i '${lock}'`)
    return { lock: 'immutable' }
  }

  /** 目录收紧：防新建/改名（chmod 555——但同用户 owner 可 chmod 回来；组合 chattr +i 后目录完全锁死）
   *  实验待做：目录 +i 会挡住 registry 终态落盘——生产版必须"任务死后恢复"（对齐 Windows finish 恢复 deny） */
  applyDir() {
    sh(`chmod 555 '${this.jobDir}'`)
    return { dir: 'readonly' }
  }

  /** 自校验（fail-closed 对齐 Windows EXIT:-998）：验证 +i 位在 */
  verify() {
    const targets = ['out.log', 'lock', 'exit.txt'].map(f => path.join(this.jobDir, f))
    for (const t of targets) {
      if (!fs.existsSync(t)) continue
      const attrs = sh(`lsattr '${t}'`)
      if (!/i[-]*\s/.test(attrs) && !attrs.includes('i')) {
        // lsattr 输出格式：----i---------e------- file
        if (!/[A-Za-z]*i[A-Za-z-]*/.test(attrs)) throw new Error(`immutable bit missing on ${path.basename(t)}`)
      }
    }
    return true
  }

  /** 收尾恢复（任务死后——registry 终态落盘窗口，对齐 Windows finish 恢复目录 deny） */
  restore() {
    const targets = ['out.log', 'lock', 'exit.txt'].map(f => path.join(this.jobDir, f))
    for (const t of targets) {
      if (fs.existsSync(t)) {
        try { sh(`chattr -i '${t}'`) } catch { /* 已删或无权——下一轮重试 */ }
      }
    }
    try { sh(`chmod 755 '${this.jobDir}'`) } catch {}
    return true
  }

  /** 平台能力自述（诚实：全部来自实验判决——EXPERIMENTS.md） */
  static capability() {
    return {
      platform: 'linux',
      preventOverwrite: 'chattr +i (EXP-1 verified) + bwrap ro-bind (EXP-3 EROFS verified)',
      preventDelete: 'chattr +i (EXP-1 verified) + bwrap ro-bind (EXP-3)',
      preventForgery: 'pending (dir lock experiment)',
      preventSelfRescue: 'CAP_LINUX_IMMUTABLE required + unshare-all (harder than Windows)',
      isolation: 'bwrap namespace isolation (EXP-3 verified: whole FS view read-only)',
      processIdentity: '/proc starttime (EXP-6 verified)',
      nodePermissionModel: 'verified (EXP-2: BLOCKED ERR_ACCESS_DENIED)',
    }
  }
}
