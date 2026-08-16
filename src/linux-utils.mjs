// dsh-cross-platform/src/linux-utils.mjs —— 锁协议跨平台工具（Linux 版三证据）
// 对应 Windows 版：procStartSec（powershell Get-Process）→ Linux /proc/<pid>/stat
import * as fs from 'node:fs'

/** 进程启动时间（epoch 秒）——/proc/<pid>/stat 第 22 字段 starttime（clock ticks since boot）
 *  换算：ticks / sysconf(_SC_CLK_TCK)（通常 100）+ btime（/proc/stat 的 boot time）*/
export function procStartSec(pid) {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf-8')
    // 字段 22 是 starttime——comm 可能含空格/括号，从最后一个 ')' 后解析
    const after = stat.slice(stat.lastIndexOf(')') + 2)
    const fields = after.split(' ')
    const starttime = Number(fields[19])   // after 的第 20 个字段 = 原字段 22
    const clkTck = 100   // Linux 标准（可读 /proc 的 _SC_CLK_TCK——通常 100）
    const btime = Number(fs.readFileSync('/proc/stat', 'utf-8').match(/btime (\d+)/)?.[1] ?? 0)
    return btime + starttime / clkTck
  } catch {
    return undefined
  }
}

/** 进程存活（跨平台 ✓） */
export function pidAlive(pid) {
  try { process.kill(pid, 0); return true } catch { return false }
}

/** 任务退出码写入协议（对齐 Windows exit.txt EXIT:<code>） */
export function writeExit(file, code) {
  try { fs.writeFileSync(file, `EXIT:${code}`) } catch {}
}
