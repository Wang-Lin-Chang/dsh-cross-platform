// dsh-cross-platform/src/detach-runner-linux.cjs —— Linux 任务 runner v2（时序重构：+i 挡一切写，含预开句柄）
// 实验判决固化：
//   EXP-1: chattr +i 防覆盖/防删（含已开句柄——比 Windows deny 硬，open-before-deny 架构失效）
//   EXP-3: bwrap 只读视图 EROFS 挡写（宿主与任务文件系统视图分离 = Linux 的 open-before-deny 等价物）
// 时序设计：
//   · exit.txt / lock：任务期间 +i（runner 不写它们）→ 任务死 → -i → 写 EXIT → 删 lock
//   · out.log：任务期间不 +i（runner 要追加 stdout）；防任务写 = bwrap 只读视图（默认）或降级披露（无 bwrap）
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')

const [jobDir, outFile, exitFile, cmdB64, mode] = process.argv.slice(2)
const cmd = Buffer.from(cmdB64 || '', 'base64').toString('utf-8')
const lockFile = path.join(jobDir, 'lock')
const sh = (c) => { try { return spawnSync('sh', ['-c', c], { timeout: 10000 }).stdout.toString().trim() } catch { return '' } }
const q = (f) => `'${f.replace(/'/g, "'\\''")}'`
const useBwrap = (mode === 'bwrap') && sh('which bwrap').length > 0

// ---- 启动时间（EXP-6 验证的 /proc 公式）----
function startSec() {
  try {
    const stat = fs.readFileSync(`/proc/${process.pid}/stat`, 'utf-8')
    const after = stat.slice(stat.lastIndexOf(')') + 2).split(' ')
    const btime = Number(fs.readFileSync('/proc/stat', 'utf-8').match(/btime (\d+)/)?.[1] ?? 0)
    return Math.floor(btime + Number(after[19]) / 100)
  } catch { return 0 }
}

// ---- lock（wx 独占 + pid:startSec）----
let lockCreated = false
try {
  fs.writeFileSync(lockFile, `${process.pid}:${startSec()}`, { flag: 'wx' })
  lockCreated = true
} catch {}

// ---- 预创建 exit.txt + 打开 out fd ----
const outFd = fs.openSync(outFile, 'a')
try { fs.writeFileSync(exitFile, '', { flag: 'wx' }) } catch {}
// 'w' 截断：exit.txt 是协议文件，每任务生命周期重写（防旧生命周期残留 append）
const exitFd = fs.openSync(exitFile, 'w')

// ---- 沙箱：+i 只给 exit.txt 和 lock（runner 不写的）；out.log 靠 bwrap 视图 ----
// bwrap 只读视图（EROFS）已挡任务对 jobDir 的一切写（含 exit.txt/lock）→ 视图模式下 +i 冗余；
// 且 chattr +i 需要 CAP_LINUX_IMMUTABLE（CI 非 root 施加失败 → verify fail-closed EXIT:-998）。
// 判决：视图模式跳过 +i（写隔离由视图承担）；非视图模式维持 +i 语义。
const hardenImmutables = !useBwrap
function applySandbox() {
  try {
    if (!hardenImmutables) return true
    if (fs.existsSync(exitFile)) sh(`chattr +i ${q(exitFile)}`)
    if (lockCreated && fs.existsSync(lockFile)) sh(`chattr +i ${q(lockFile)}`)
  } catch { return false }
  return true
}
function verifySandbox() {
  if (!hardenImmutables) return true
  for (const f of [exitFile, ...(lockCreated ? [lockFile] : [])]) {
    if (!fs.existsSync(f)) continue
    const attrs = sh(`lsattr ${q(f)}`)
    if (!/[A-Za-z]*i[A-Za-z-]*/.test(attrs)) return false
  }
  return true
}
function failClosed() {
  try { sh(`chattr -i ${q(exitFile)}`) } catch {}
  try { fs.writeSync(exitFd, 'EXIT:-998') } catch {}
  try { fs.closeSync(exitFd) } catch {}
  try { fs.closeSync(outFd) } catch {}
  process.exit(0)
}
if (!applySandbox() || !verifySandbox()) failClosed()

// ---- spawn 任务 ----
// bwrap 挂载顺序：ro-bind / → tmpfs /tmp → ro-bind jobDir（覆盖 tmpfs 的空路径——任务目录在视图中只读可见）
// --share-net：无特权 CI 上 unshare-all 的 netns 设置被拒（RTM_NEWADDR EPERM）；且任务网络保留
// 与 macOS/Windows 后端能力对齐（三平台任务均可联网）
const taskArgs = useBwrap
  ? ['--ro-bind', '/', '/', '--tmpfs', '/tmp', '--ro-bind', jobDir, jobDir, '--dev', '/dev', '--proc', '/proc', '--unshare-all', '--share-net', '--chdir', jobDir, 'bash', '-c', cmd]
  : ['-c', cmd]
const child = spawn(useBwrap ? 'bwrap' : 'bash', taskArgs, { stdio: ['ignore', 'pipe', 'pipe'], cwd: jobDir })
child.stdout.on('data', (d) => { try { fs.writeSync(outFd, d) } catch {} })
child.stderr.on('data', (d) => { try { fs.writeSync(outFd, d) } catch {} })

child.on('exit', (code) => {
  const finalCode = code ?? 1
  // 收尾时序：-i exit.txt → 写退出码 → 关 fd → 删 lock（-i 后）→ 目录恢复
  try { sh(`chattr -i ${q(exitFile)}`) } catch {}
  try { fs.writeSync(exitFd, `EXIT:${finalCode}`) } catch {}
  try { fs.closeSync(exitFd) } catch {}
  try { fs.closeSync(outFd) } catch {}
  if (lockCreated) {
    try { sh(`chattr -i ${q(lockFile)}`) } catch {}
    try { fs.unlinkSync(lockFile) } catch {}
  }
  process.exit(0)
})
child.on('error', () => {
  try { sh(`chattr -i ${q(exitFile)}`) } catch {}
  try { fs.writeSync(exitFd, 'EXIT:1') } catch {}
  process.exit(1)
})
