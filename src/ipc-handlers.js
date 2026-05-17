const { ipcMain, dialog, app } = require('electron')
const fs            = require('fs')
const path          = require('path')
const os            = require('os')
const { execSync, exec } = require('child_process')
const asar          = require('@electron/asar')
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses')

// ── Theme presets ──────────────────────────────────────────────
const PRESETS_FILE = path.join(app.getPath('userData'), 'theme-presets.json')

function readPresets() {
  try {
    if (fs.existsSync(PRESETS_FILE)) return JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'))
  } catch {}
  return {}
}

function writePresets(presets) {
  fs.writeFileSync(PRESETS_FILE, JSON.stringify(presets, null, 2), 'utf8')
}

ipcMain.handle('load-presets', () => {
  try { return { ok: true, presets: readPresets() } }
  catch (err) { return { ok: false, error: err.message } }
})

ipcMain.handle('save-preset', (event, { name, config }) => {
  try {
    const presets = readPresets()
    presets[name] = config
    writePresets(presets)
    return { ok: true }
  } catch (err) { return { ok: false, error: err.message } }
})

ipcMain.handle('delete-preset', (event, name) => {
  try {
    const presets = readPresets()
    delete presets[name]
    writePresets(presets)
    return { ok: true }
  } catch (err) { return { ok: false, error: err.message } }
})

// ── CSS base bundled with the app ──────────────────────────────
// custom-base.css is the proven working theme with hardcoded palette values.
// We find-and-replace those values with whatever the user picks in the UI.
const BASE_CSS_PATH = path.join(app.getAppPath(), 'custom-base.css')

// Default image placeholder filenames embedded in custom-base.css
const DEFAULT_BODY_IMG    = '/images/custom/First_Closed_Beta_Wallpaper.webp'
const DEFAULT_SIDEBAR_IMG = '/images/custom/Character_Himeko_Splash_Art.webp'
const DEFAULT_PANEL_IMG   = '/images/custom/Star_Rail_Countdown_3_Days_-_Himeko.webp'


// ── Convert #RRGGBB hex → { r, g, b } ─────────────────────────
function hexToRgb(hex) {
  hex = hex.replace(/^#/, '')
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  }
}

// ── Apply palette substitutions to any CSS string ──────────────
// Replaces the default Himeko palette hex/rgba values with whatever
// the user selected in the UI.  Safe to call on both the main CSS
// and on SHELL_CSS_TEMPLATE.
function applyColorReplacements(css, config) {
  const crimson = hexToRgb(config.themeCrimson)
  const gold    = hexToRgb(config.themeGold)
  const ember   = hexToRgb(config.themeEmber)
  const user    = hexToRgb(config.userBubble)
  const ai      = hexToRgb(config.aiBubble)
  const comp    = hexToRgb(config.composerBg)

  // ── Hex colour literals (case-insensitive) ─────────────────
  css = css.replace(/#D0271E/gi, config.themeCrimson.toUpperCase())
  css = css.replace(/#E5B458/gi, config.themeGold.toUpperCase())
  css = css.replace(/#863303/gi, config.themeEmber.toUpperCase())
  css = css.replace(/#F5F0EC/gi, config.userText.toUpperCase())
  css = css.replace(/#C8A898/gi, config.textMuted.toUpperCase())

  // ── rgba() triplets ────────────────────────────────────────
  // Anchored inside rgba( so partial-number false matches are impossible.
  // Handles any spacing variation between commas.
  css = css.replace(/rgba\(\s*208,\s*39,\s*30,/g,   `rgba(${crimson.r}, ${crimson.g}, ${crimson.b},`)
  css = css.replace(/rgba\(\s*229,\s*180,\s*88,/g,  `rgba(${gold.r}, ${gold.g}, ${gold.b},`)
  css = css.replace(/rgba\(\s*134,\s*51,\s*3,/g,    `rgba(${ember.r}, ${ember.g}, ${ember.b},`)
  css = css.replace(/rgba\(\s*100,\s*30,\s*0,/g,    `rgba(${user.r}, ${user.g}, ${user.b},`)
  css = css.replace(/rgba\(\s*252,\s*243,\s*228,/g, `rgba(${ai.r}, ${ai.g}, ${ai.b},`)
  css = css.replace(/rgba\(\s*4,\s*1,\s*0,/g,       `rgba(${comp.r}, ${comp.g}, ${comp.b},`)

  // ── Image position offsets ─────────────────────────────────
  // sidebarPosX/Y → left nav/aside image (Character_Himeko), two rules
  // panelPosX/Y   → right Cowork panel (#frame-peek-popover)
  if (config.sidebarPosX !== undefined) {
    const sp = `${config.sidebarPosX}% ${config.sidebarPosY}%`
    css = css.replace(/center 67% \/ cover/g, `${sp} / cover`)
    css = css.replace(/center 40% \/ cover/g, `${sp} / cover`)
  }
  if (config.panelPosX !== undefined) {
    const pp = `${config.panelPosX}% ${config.panelPosY}%`
    css = css.replace(/60% 30% \/ cover/g, `${pp} / cover`)
  }

  // ── Body / shell background ────────────────────────────────
  // Only touch the two targeted occurrences, not every #000000 in the file.
  css = css.replace(/(--claude-background-color:\s*)#000000/g,
    `$1${config.bgBase}`)
  css = css.replace(/(background-color:\s*)#000000(\s*!important;\s*\/\* fallback \*\/)/g,
    `$1${config.bgBase}$2`)

  // ── Body background override ────────────────────────────────
  // Appended at the end so it wins the cascade.
  // The dark gradient stops become bgBase-tinted instead of pure black,
  // so the Base background picker has a real visible effect.
  // The DEFAULT_BODY_IMG placeholder here is still picked up by the
  // image-URL-swap step that runs after this function, so user-picked
  // wallpapers work correctly too.
  const bg = hexToRgb(config.bgBase)
  css += `

/* ── bgBase body override ── */
body {
  background-image:
    linear-gradient(
      160deg,
      rgba(${ember.r}, ${ember.g}, ${ember.b}, 0.35)  0%,
      rgba(${crimson.r}, ${crimson.g}, ${crimson.b}, 0.18) 15%,
      rgba(${bg.r}, ${bg.g}, ${bg.b}, 0.02) 38%,
      rgba(${bg.r}, ${bg.g}, ${bg.b}, 0.35) 68%,
      rgba(${bg.r}, ${bg.g}, ${bg.b}, 0.78) 100%
    ),
    url("${DEFAULT_BODY_IMG}") !important;
  background-color: ${config.bgBase} !important;
}
`

  return css
}


// ── Export resolved CSS to a file ─────────────────────────────
// Applies all palette substitutions + image URL swaps (no base64
// embedding — keeps the file human-readable) then lets the user
// save it so they can inspect what would actually be injected.
ipcMain.handle('export-css', async (event, config) => {
  try {
    let css = fs.readFileSync(BASE_CSS_PATH, 'utf8')
    css = applyColorReplacements(css, config)

    // Swap image placeholder URLs with user-picked paths (keeps them as
    // file:// references so the exported file is still readable)
    if (config.bodyImage) {
      const fwd = config.bodyImage.replace(/\\/g, '/')
      css = css.split(`"${DEFAULT_BODY_IMG}"`).join(`"${fwd}"`)
    }
    if (config.sidebarImage) {
      const fwd = config.sidebarImage.replace(/\\/g, '/')
      css = css.split(`"${DEFAULT_SIDEBAR_IMG}"`).join(`"${fwd}"`)
    }
    if (config.panelImage) {
      const fwd = config.panelImage.replace(/\\/g, '/')
      css = css.split(`"${DEFAULT_PANEL_IMG}"`).join(`"${fwd}"`)
    }

    const result = await dialog.showSaveDialog({
      title: 'Save resolved CSS',
      defaultPath: path.join(app.getPath('desktop'), 'custom-resolved.css'),
      filters: [{ name: 'CSS', extensions: ['css'] }],
    })
    if (result.canceled) return { ok: false, error: 'Cancelled' }

    fs.writeFileSync(result.filePath, css, 'utf8')
    return { ok: true, path: result.filePath }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})


// ── Pick an image file ─────────────────────────────────────────
ipcMain.handle('pick-image', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Choose an image',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    properties: ['openFile']
  })
  if (result.canceled) return null
  return result.filePaths[0]
})


// ── Shell CSS template ─────────────────────────────────────────
// Applied to .vite/renderer/main_window/index.html (title bar / chrome).
// Uses the same default palette so applyColorReplacements() can update it.
const SHELL_CSS_TEMPLATE = `
/* ═══ HIMEKO SHELL THEME ═══════════════════════════════════════
   Controls the Electron window frame (title bar, outer chrome). */
:root,
.darkTheme {
  --claude-background-color: #000000 !important;
  --claude-foreground-color: #FFFFFF !important;
  --claude-secondary-color:  #C8A898 !important;
  --claude-border:           rgba(229,180,88,0.20) !important;
  --claude-border-300:       rgba(229,180,88,0.14) !important;
  --claude-border-300-more:  rgba(229,180,88,0.32) !important;
  --claude-text-100: #FFFFFF !important;
  --claude-text-200: #E0D0C0 !important;
  --claude-text-400: #C8A898 !important;
  --claude-text-500: #907060 !important;
  --claude-description-text: #B09080 !important;
  --bg-000:  3  60%  1% !important;
  --bg-100:  3  40%  4% !important;
  --bg-200:  5  45%  7% !important;
  --bg-300:  7  42% 11% !important;
  --bg-400: 10  38% 15% !important;
  --bg-500: 12  34% 19% !important;
  --text-000:  0  0% 100% !important;
  --text-100:  0  0%  96% !important;
  --text-200: 20 15%  76% !important;
  --text-300: 20 10%  56% !important;
  --text-400: 20  8%  40% !important;
  --text-500: 20  6%  30% !important;
  --accent-brand:  3 74% 46% !important;
  --brand-000:    23 96% 15% !important;
  --brand-100:    23 96% 27% !important;
  --brand-200:     3 74% 46% !important;
  --border-100:   3 50% 14% !important;
  --border-200:   3 55% 20% !important;
  --border-300:  41 65% 32% !important;
  --border-400:  41 72% 44% !important;
  --accent-000:  41 65% 40% !important;
  --accent-100:  41 72% 52% !important;
  --accent-200:  41 72% 62% !important;
  --accent-900:  41 50% 10% !important;
}
body { background-color: #000000 !important; color: #FFFFFF !important; }
body::after {
  content: "";
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg,transparent 0%,#5A0A08 12%,#D0271E 30%,#E5B458 50%,#D0271E 70%,#5A0A08 88%,transparent 100%);
  z-index: 9999;
  pointer-events: none;
}
/* ══════════════════════════════════════════════════════════════ */
`


// ── Full ASAR patch pipeline ───────────────────────────────────
ipcMain.handle('patch-claude', async (event, config) => {
  const TEMP_DIR      = path.join(os.tmpdir(), 'claude-theme-patch')
  const TEMP_ASAR_IN  = path.join(os.tmpdir(), 'claude-theme-patch-in.asar')
  const TEMP_ASAR_OUT = path.join(os.tmpdir(), 'claude-theme-patch-out.asar')

  const log = (level, message) => {
    try { event.sender.send('patch-log', { level, message }) } catch {}
  }

  const retryBusy = async (fn, maxMs = 8000) => {
    const start = Date.now()
    while (true) {
      try { return fn() } catch (err) {
        if ((err.code !== 'EBUSY' && err.code !== 'EPERM') || Date.now() - start > maxMs) throw err
        await new Promise(r => setTimeout(r, 600))
      }
    }
  }

  try {
    // ── Step 1: Build resolved CSS and export to Desktop ──────
    // Applies all colour substitutions + image URL swaps, then writes the
    // result to custom-resolved.css on the Desktop so it can be inspected.
    // The patch pipeline reads FROM that file — what you see is what gets injected.
    log('step', 'Step 1 — Building resolved CSS…')
    let css = fs.readFileSync(BASE_CSS_PATH, 'utf8')
    css = applyColorReplacements(css, config)

    if (config.bodyImage) {
      const fwd = config.bodyImage.replace(/\\/g, '/')
      css = css.split(`"${DEFAULT_BODY_IMG}"`).join(`"${fwd}"`)
      log('info', `  Body image: ${path.basename(config.bodyImage)}`)
    }
    if (config.sidebarImage) {
      const fwd = config.sidebarImage.replace(/\\/g, '/')
      css = css.split(`"${DEFAULT_SIDEBAR_IMG}"`).join(`"${fwd}"`)
      log('info', `  Sidebar image: ${path.basename(config.sidebarImage)}`)
    }
    if (config.panelImage) {
      const fwd = config.panelImage.replace(/\\/g, '/')
      css = css.split(`"${DEFAULT_PANEL_IMG}"`).join(`"${fwd}"`)
      log('info', `  Panel image: ${path.basename(config.panelImage)}`)
    }

    // Export to Desktop so you can open it in any editor and verify
    const exportPath = path.join(app.getPath('desktop'), 'custom-resolved.css')
    fs.writeFileSync(exportPath, css, 'utf8')
    log('ok', `  Exported → ${exportPath}`)

    // Read it back — the patch uses exactly what was written to disk
    css = fs.readFileSync(exportPath, 'utf8')
    log('ok', '  CSS ready.')

    // Shell CSS also gets palette replacements applied
    const SHELL_CSS = applyColorReplacements(SHELL_CSS_TEMPLATE, config)

    // ── Step 2: Locate Claude ─────────────────────────────────
    log('step', 'Step 2 — Locating Claude…')
    let claudeExe = ''
    const psCmds = [
      '(Get-Process claude -ErrorAction SilentlyContinue | Select-Object -First 1).Path',
      '(Get-AppxPackage | Where-Object { $_.Name -like "*Claude*" } | Select-Object -First 1).InstallLocation + "\\app\\claude.exe"',
    ]
    for (const cmd of psCmds) {
      try {
        const out = execSync(`powershell -command "${cmd}"`, { encoding: 'utf8', timeout: 6000 }).trim()
        if (out && fs.existsSync(out)) { claudeExe = out; break }
      } catch {}
    }
    if (!claudeExe) {
      log('error', '  Could not locate claude.exe.')
      return { ok: false, error: 'Could not find Claude. Make sure Claude is installed, then try again.' }
    }
    const claudeDir    = path.dirname(claudeExe)
    const resourcesDir = path.join(claudeDir, 'resources')
    const asarPath     = path.join(resourcesDir, 'app.asar')
    log('path', `  Claude: ${claudeExe}`)
    log('path', `  ASAR:   ${asarPath}`)
    if (!fs.existsSync(asarPath)) {
      return { ok: false, error: `Could not find app.asar at:\n${asarPath}` }
    }
    log('ok', '  Claude found.')

    // ── Step 3: Kill ALL Claude processes + wait ──────────────
    log('step', 'Step 3 — Killing Claude…')
    const killCmds = [
      'taskkill /F /T /IM claude.exe',
      'powershell -command "Get-Process claude -ErrorAction SilentlyContinue | Stop-Process -Force"',
    ]
    for (const cmd of killCmds) {
      try { execSync(cmd, { stdio: 'ignore' }) } catch {}
    }
    log('info', '  Waiting 3 s for handles to release…')
    await new Promise(r => setTimeout(r, 3000))
    log('ok', '  Claude terminated.')

    // ── Step 4: Take ownership + grant full permissions ───────
    log('step', 'Step 4 — Taking ownership…')
    try {
      execSync(`takeown /F "${claudeDir}" /R /D Y`, { stdio: 'ignore' })
      execSync(`icacls "${claudeDir}" /grant "%USERNAME%":F /T /C /Q`, { stdio: 'ignore' })
      log('ok', '  Permissions granted.')
    } catch (err) {
      return { ok: false, error: `Could not take ownership of Claude's folder.\nTry running as Administrator.\n\n${err.message}` }
    }

    // ── Step 5: Disable ASAR integrity fuse ──────────────────
    log('step', 'Step 5 — Disabling ASAR integrity check…')
    try {
      await flipFuses(claudeExe, {
        version: FuseVersion.V1,
        [FuseV1Options.EnableAsarIntegrityValidation]: false,
      })
      log('ok', '  Fuse flipped.')
    } catch (err) {
      log('warn', `  Fuse flip: ${err.message} (may already be disabled)`)
    }

    process.noAsar = true

    // ── Step 6: Backup (once) ─────────────────────────────────
    const backupPath = path.join(resourcesDir, 'app.asar.bak')
    if (!fs.existsSync(backupPath)) {
      log('step', 'Step 6 — Backing up app.asar…')
      await retryBusy(() => fs.copyFileSync(asarPath, backupPath))
      log('ok', `  Backup: ${backupPath}`)
    } else {
      log('step', 'Step 6 — Backup already exists, skipping.')
    }

    // ── Step 7: Copy CLEAN BACKUP + unpacked companion to TEMP, extract ──
    // Always extract from app.asar.bak (original untouched Claude ASAR)
    // so we never stack injections on top of a previously patched file.
    log('step', 'Step 7 — Copying clean backup to temp and extracting…')
    for (const p of [TEMP_ASAR_IN, TEMP_ASAR_OUT]) {
      try { fs.unlinkSync(p) } catch {}
    }
    if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true, force: true })

    await retryBusy(() => fs.copyFileSync(backupPath, TEMP_ASAR_IN))
    log('info', `  Copied clean backup to ${TEMP_ASAR_IN}`)

    // Copy .unpacked companion so extractAll can find native binaries
    const origUnpackedPath = asarPath + '.unpacked'
    const tempUnpackedPath = TEMP_ASAR_IN + '.unpacked'
    if (fs.existsSync(origUnpackedPath)) {
      try { fs.rmSync(tempUnpackedPath, { recursive: true, force: true }) } catch {}
      try {
        execSync(
          `robocopy "${origUnpackedPath}" "${tempUnpackedPath}" /E /NFL /NDL /NJH /NJS /NC /NS /NP`,
          { stdio: 'ignore' }
        )
      } catch (e) {
        if (e.status >= 8) throw new Error(`robocopy failed (exit ${e.status}): ${e.message}`)
      }
      log('info', '  Copied .unpacked companion')
    }

    asar.extractAll(TEMP_ASAR_IN, TEMP_DIR)
    log('ok', '  Extracted.')

    // ── Steps 8–9: Patch files ────────────────────────────────
    const MAIN_VIEW  = path.join(TEMP_DIR, '.vite', 'build', 'mainView.js')
    const SHELL_HTML = path.join(TEMP_DIR, '.vite', 'renderer', 'main_window', 'index.html')

    // -- 8a. Embed images as base64
    log('step', 'Step 8 — Embedding images…')
    const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }

    // Pattern 1: /images/custom/FILENAME  (default placeholder paths)
    css = css.replace(/url\("?\/images\/custom\/([^")\s]+)"?\)/g, (_, fname) => {
      const fpath    = path.join(app.getPath('userData'), 'images', fname)
      const fallback = path.join(process.resourcesPath || '', '..', 'Images', fname)
      const found    = [fpath, fallback].find(p => fs.existsSync(p))
      if (found) {
        const ext  = path.extname(fname).slice(1).toLowerCase()
        const mime = MIME[ext] || 'image/webp'
        const b64  = fs.readFileSync(found).toString('base64')
        log('path', `  Embedded: ${fname}`)
        return `url("data:${mime};base64,${b64}")`
      }
      log('warn', `  Image not found, skipping: ${fname}`)
      return 'url("")'
    })

    // Pattern 2: full Windows/Unix file paths inserted in Step 1
    css = css.replace(/url\("([^"]+\.(png|jpe?g|webp|gif))"\)/gi, (match, filePath) => {
      if (filePath.startsWith('data:')) return match  // already embedded
      const normalized = filePath.replace(/\//g, path.sep)
      if (!fs.existsSync(normalized)) {
        log('warn', `  Image not found, skipping: ${path.basename(filePath)}`)
        return 'url("")'
      }
      const ext  = path.extname(normalized).slice(1).toLowerCase()
      const mime = MIME[ext] || 'image/webp'
      const b64  = fs.readFileSync(normalized).toString('base64')
      log('path', `  Embedded: ${path.basename(filePath)}`)
      return `url("data:${mime};base64,${b64}")`
    })
    log('ok', '  Images embedded.')

    // -- 8b. Escape CSS for JS single-quoted string
    const cssJs = css
      .replace(/\\/g, '\\\\')
      .replace(/'/g,  "\\'")
      .replace(/\r\n/g, '\\n')
      .replace(/\n/g,   '\\n')
      .replace(/\r/g,   '\\n')

    const injection = `r.webFrame.insertCSS('${cssJs}',{cssOrigin:'author'});`

    // -- 8c. Inline override — strips React's hardcoded background-color
    const inlineOverrideJS = `
// ── HIMEKO INLINE OVERRIDE ──────────────────────────────────────
(function() {
  var BEIGE = 'rgb(231, 222, 212)';
  function fixEl(el) {
    if (!el || !el.style) return;
    if (el.style.backgroundColor === BEIGE) el.style.removeProperty('background-color');
    if (el === document.body && el.style.backgroundColor && el.style.backgroundColor !== 'transparent' && el.style.backgroundColor !== '') el.style.removeProperty('background-color');
  }
  function scanTree(root) { try { fixEl(root); var els=root.querySelectorAll?root.querySelectorAll('[style*="background"]'):[];for(var i=0;i<els.length;i++)fixEl(els[i]); } catch(e){} }
  var obs = new MutationObserver(function(muts) { for(var i=0;i<muts.length;i++){var m=muts[i];if(m.type==='attributes')fixEl(m.target);if(m.type==='childList')for(var j=0;j<m.addedNodes.length;j++){var n=m.addedNodes[j];if(n.nodeType===1)scanTree(n);}} });
  function start() { scanTree(document.documentElement); obs.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style']}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
// ── END HIMEKO INLINE OVERRIDE ──────────────────────────────────
`
    const fullInjection = `${injection}\n${inlineOverrideJS}`

    // -- 9a. Patch mainView.js
    log('step', 'Step 9 — Patching mainView.js…')
    if (!fs.existsSync(MAIN_VIEW)) {
      return { ok: false, error: 'Could not find .vite/build/mainView.js inside the ASAR. Claude\'s internal structure may have changed.' }
    }
    let content = fs.readFileSync(MAIN_VIEW, 'utf8')

    // Strip any previous injections (all known marker styles)
    content = content.replace(/r\.webFrame\.insertCSS\('\/\* (?:HIMEKO|LOAD TEST|═)[\s\S]*?\{cssOrigin:'author'\}\);/g, '')
    content = content.replace(/r\.webFrame\.insertCSS\(':root[\s\S]*?\{cssOrigin:'author'\}\);/g, '')
    content = content.replace(/r\.webFrame\.insertCSS\('[\s\S]*?\{cssOrigin:'author'\}\);/g, '')
    content = content.replace(/if\(typeof r!=='undefined'[\s\S]*?catch\(e\)\{\}\}\}/g, '')
    content = content.replace(/\/\/ HIMEKO_STYLE_LOGGER[\s\S]*?\/\/ END_HIMEKO_STYLE_LOGGER/g, '')
    content = content.replace(/\/\/ ── HIMEKO INLINE OVERRIDE[\s\S]*?\/\/ ── END HIMEKO INLINE OVERRIDE ──────────────────────────────────────\n/g, '')
    content = content.replace(/\/\* claude-theme-editor-start \*\/[\s\S]*?\/\* claude-theme-editor-end \*\/\n?/g, '')
    content = content.replace(/\/\* claude-theme-editor \*\/\(function[\s\S]*?\}\)\(\);/g, '')

    if (content.includes('//# sourceMappingURL=')) {
      content = content.replace(/(\/\/# sourceMappingURL=)/, `${fullInjection}\n$1`)
    } else {
      content = content.trimEnd() + '\n' + fullInjection
    }
    fs.writeFileSync(MAIN_VIEW, content, 'utf8')
    log('ok', '  mainView.js patched.')

    // -- 9b. Patch shell index.html
    log('step', 'Step 9b — Patching shell index.html…')
    if (fs.existsSync(SHELL_HTML)) {
      let shellHtml = fs.readFileSync(SHELL_HTML, 'utf8')
      shellHtml = shellHtml.replace(/\n?<!-- HIMEKO SHELL THEME -->[\s\S]*?<!-- \/HIMEKO SHELL THEME -->/g, '')
      shellHtml = shellHtml.replace(/\n?<!-- claude-theme-editor -->[\s\S]*?<!-- \/claude-theme-editor -->/g, '')
      const shellInjection = `\n<!-- HIMEKO SHELL THEME -->\n<style>\n${SHELL_CSS}\n</style>\n<!-- /HIMEKO SHELL THEME -->`
      if (shellHtml.includes('</head>')) {
        shellHtml = shellHtml.replace('</head>', `${shellInjection}\n</head>`)
      } else {
        shellHtml = shellHtml.trimEnd() + '\n' + shellInjection
      }
      fs.writeFileSync(SHELL_HTML, shellHtml, 'utf8')
      log('ok', '  index.html patched.')
    } else {
      log('warn', '  index.html not found — skipping shell patch.')
    }

    // ── Step 10: Repack to temp, write back ───────────────────
    // native .node modules must stay in the .unpacked companion dir;
    // createPackageWithOptions with unpack:'**/*.node' ensures that.
    log('step', 'Step 10 — Repacking…')
    await asar.createPackageWithOptions(TEMP_DIR, TEMP_ASAR_OUT, {
      unpack: '**/*.node',
    })
    log('ok', `  Packed to ${TEMP_ASAR_OUT}`)

    log('step', 'Step 10 — Writing new asar to Claude resources…')
    const newAsarBytes = fs.readFileSync(TEMP_ASAR_OUT)
    await retryBusy(() => fs.writeFileSync(asarPath, newAsarBytes))
    log('ok', `  Written to ${asarPath}`)

    process.noAsar = false

    // ── Step 11: Cleanup ──────────────────────────────────────
    log('step', 'Step 11 — Cleaning up temp files…')
    try { fs.rmSync(TEMP_DIR, { recursive: true, force: true }) } catch {}
    try { fs.rmSync(TEMP_ASAR_IN + '.unpacked', { recursive: true, force: true }) } catch {}
    try { fs.unlinkSync(TEMP_ASAR_IN) } catch {}
    try { fs.unlinkSync(TEMP_ASAR_OUT) } catch {}
    log('ok', '  Done.')

    log('ok', '  Done. Launch Claude manually to see your theme.')

    return { ok: true, claudeExe }

  } catch (err) {
    process.noAsar = false
    log('error', `Unexpected error: ${err.message}`)
    try { fs.rmSync(TEMP_DIR, { recursive: true, force: true }) } catch {}
    try { fs.rmSync(TEMP_ASAR_IN + '.unpacked', { recursive: true, force: true }) } catch {}
    try { fs.unlinkSync(TEMP_ASAR_IN) } catch {}
    try { fs.unlinkSync(TEMP_ASAR_OUT) } catch {}
    return { ok: false, error: err.message }
  }
})
