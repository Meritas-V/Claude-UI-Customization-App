// ── Defaults ──────────────────────────────────────────────────
const defaults = {
  sidebarOpacity:     60,
  panelOpacity:       80,
  codeOpacity:        90,
  userBubbleOpacity:  42,
  aiBubbleOpacity:    82,
  composerOpacity:    88,
  // Image position offsets (match the hardcoded values in custom-base.css)
  sidebarPosX: 60,   // panel (right) image — default 60% 30%
  sidebarPosY: 30,
  panelPosX:   50,   // sidebar (left) image — default center(50%) 67%
  panelPosY:   67,
}

// ── Sliders ───────────────────────────────────────────────────
const sliders = [
  { slider: 'sidebarOpacity',    label: 'sidebarOpacityValue'    },
  { slider: 'panelOpacity',      label: 'panelOpacityValue'      },
  { slider: 'codeOpacity',       label: 'codeOpacityValue'       },
  { slider: 'userBubbleOpacity', label: 'userBubbleOpacityValue' },
  { slider: 'aiBubbleOpacity',   label: 'aiBubbleOpacityValue'   },
  { slider: 'composerOpacity',   label: 'composerOpacityValue'   },
  { slider: 'sidebarPosX',       label: 'sidebarPosXValue'       },
  { slider: 'sidebarPosY',       label: 'sidebarPosYValue'       },
  { slider: 'panelPosX',         label: 'panelPosXValue'         },
  { slider: 'panelPosY',         label: 'panelPosYValue'         },
]

sliders.forEach(({ slider, label }) => {
  const input = document.getElementById(slider)
  const span  = document.getElementById(label)
  input.value      = defaults[slider]
  span.textContent = defaults[slider] + '%'
  input.addEventListener('input', () => {
    span.textContent = input.value + '%'
  })
})

// ── Image slots ───────────────────────────────────────────────
const state = {
  sidebarImage: null,
  panelImage:   null,
  bodyImage:    null,
}

function wireImageSlot(slotId, stateKey) {
  const slot = document.getElementById(slotId)
  slot.addEventListener('click', async () => {
    const filePath = await window.themeAPI.pickImage()
    if (!filePath) return
    // Show a short filename so the slot stays compact
    slot.textContent = '✓ ' + filePath.split(/[\\/]/).pop()
    slot.title = filePath
    state[stateKey] = filePath
    updatePreview()
  })
}

wireImageSlot('sidebarImageSlot', 'sidebarImage')
wireImageSlot('panelImageSlot',   'panelImage')
wireImageSlot('bodyImageSlot',    'bodyImage')

// ── Gather config ─────────────────────────────────────────────
function gatherConfig() {
  return {
    // Palette
    themeCrimson:   document.getElementById('themeCrimson').value,
    themeGold:      document.getElementById('themeGold').value,
    themeEmber:     document.getElementById('themeEmber').value,
    // Bubbles & composer
    userBubble:     document.getElementById('userBubble').value,
    aiBubble:       document.getElementById('aiBubble').value,
    composerBg:     document.getElementById('composerBg').value,
    // Text & surfaces
    bgBase:         document.getElementById('bgBase').value,
    userText:       document.getElementById('userText').value,
    aiText:         document.getElementById('aiText').value,
    textMuted:      document.getElementById('textMuted').value,
    // Images
    sidebarImage:   state.sidebarImage,
    panelImage:     state.panelImage,
    bodyImage:      state.bodyImage,
    // Opacities
    sidebarOpacity:    document.getElementById('sidebarOpacity').value,
    panelOpacity:      document.getElementById('panelOpacity').value,
    codeOpacity:       document.getElementById('codeOpacity').value,
    userBubbleOpacity: document.getElementById('userBubbleOpacity').value,
    aiBubbleOpacity:   document.getElementById('aiBubbleOpacity').value,
    composerOpacity:   document.getElementById('composerOpacity').value,
    // Image position offsets
    sidebarPosX: document.getElementById('sidebarPosX').value,
    sidebarPosY: document.getElementById('sidebarPosY').value,
    panelPosX:   document.getElementById('panelPosX').value,
    panelPosY:   document.getElementById('panelPosY').value,
  }
}

// ── Preview ───────────────────────────────────────────────────
function toUrl(filePath) {
  if (!filePath) return 'none'
  const clean = filePath.replace(/\\/g, '/')
  return `url("${clean}")`
}

function updatePreview() {
  const config = gatherConfig()
  const pct    = (val) => (parseInt(val) / 100).toFixed(2)
  const mock   = document.querySelector('.mock-claude')

  // Palette
  mock.style.setProperty('--preview-crimson',  config.themeCrimson)
  mock.style.setProperty('--preview-gold',     config.themeGold)
  mock.style.setProperty('--preview-ember',    config.themeEmber)

  // Bubbles & composer
  mock.style.setProperty('--preview-user-bubble',   config.userBubble)
  mock.style.setProperty('--preview-ai-bubble',     config.aiBubble)
  mock.style.setProperty('--preview-composer-bg',   config.composerBg)

  // Text & surfaces
  mock.style.setProperty('--preview-user-text',  config.userText)
  mock.style.setProperty('--preview-ai-text',    config.aiText)
  mock.style.setProperty('--preview-text-muted', config.textMuted)

  // Opacities
  mock.style.setProperty('--preview-sidebar-opacity',     pct(config.sidebarOpacity))
  mock.style.setProperty('--preview-panel-opacity',       pct(config.panelOpacity))
  mock.style.setProperty('--preview-code-opacity',        pct(config.codeOpacity))
  mock.style.setProperty('--preview-user-bubble-opacity', pct(config.userBubbleOpacity))
  mock.style.setProperty('--preview-ai-bubble-opacity',   pct(config.aiBubbleOpacity))
  mock.style.setProperty('--preview-composer-opacity',    pct(config.composerOpacity))

  // Images — set CSS variables so gradient overlays defined in style.css are preserved
  // sidebarImageSlot shows on RIGHT of mock; panelImageSlot shows on LEFT — hence the cross-map
  mock.style.setProperty('--preview-bg-base',       config.bgBase)
  mock.style.setProperty('--preview-body-image',    toUrl(config.bodyImage))
  mock.style.setProperty('--preview-sidebar-image', toUrl(config.panelImage))
  mock.style.setProperty('--preview-panel-image',   toUrl(config.sidebarImage))
  // Positions — cross-mapped to match the image swap
  mock.style.setProperty('--preview-sidebar-pos', `${config.panelPosX}% ${config.panelPosY}%`)
  mock.style.setProperty('--preview-panel-pos',   `${config.sidebarPosX}% ${config.sidebarPosY}%`)
}

// Apply defaults on load
updatePreview()

// ── Buttons ───────────────────────────────────────────────────
// ── Disclaimer modal ─────────────────────────────────────────
const overlay       = document.getElementById('disclaimerOverlay')
const disclaimerChk = document.getElementById('disclaimerCheck')
const modalConfirm  = document.getElementById('modalConfirm')

// Show disclaimer immediately on launch
overlay.classList.remove('hidden')

// Checkbox gates the confirm button
disclaimerChk.addEventListener('change', () => {
  modalConfirm.disabled = !disclaimerChk.checked
})

// Confirm — just close and let them use the app
modalConfirm.addEventListener('click', () => {
  overlay.classList.add('hidden')
})

// ── Log panel ─────────────────────────────────────────────────
const logPanel = document.getElementById('logPanel')
const logBody  = document.getElementById('logBody')

document.getElementById('logClose').addEventListener('click', () => {
  logPanel.classList.add('hidden')
})

function logLine(level, message) {
  const el = document.createElement('div')
  el.className = `log-line ${level}`
  el.textContent = message
  logBody.appendChild(el)
  logBody.scrollTop = logBody.scrollHeight
}

function clearLog() {
  logBody.innerHTML = ''
}

// Listen for progress events from the main process
window.themeAPI.onPatchLog(({ level, message }) => {
  logLine(level, message)
})

// ── Export button — save resolved CSS to a file ───────────────
document.getElementById('btnExport').addEventListener('click', async () => {
  const config = gatherConfig()
  const result = await window.themeAPI.exportCss(config)
  if (result.ok) {
    alert(`CSS exported to:\n${result.path}`)
  } else {
    alert(`Export failed: ${result.error}`)
  }
})

// ── Apply button — full ASAR patch pipeline ───────────────────
document.getElementById('btnApply').addEventListener('click', async () => {
  clearLog()
  logPanel.classList.remove('hidden')
  logLine('step', '— Starting patch pipeline —')

  const config = gatherConfig()
  const result = await window.themeAPI.patchClaude(config)

  if (result.ok) {
    logLine('ok', '— All done. Claude is restarting with your theme applied. —')
  } else {
    logLine('error', '— Pipeline failed —')
    logLine('error', result.error)
  }
})

// ── Live preview — fire on every control change ───────────────
const liveInputs = [
  'themeCrimson', 'themeGold', 'themeEmber',
  'userBubble', 'aiBubble', 'composerBg',
  'bgBase', 'userText', 'aiText', 'textMuted',
  'sidebarOpacity', 'panelOpacity', 'codeOpacity',
  'userBubbleOpacity', 'aiBubbleOpacity', 'composerOpacity',
  'sidebarPosX', 'sidebarPosY', 'panelPosX', 'panelPosY',
]

liveInputs.forEach(id => {
  document.getElementById(id).addEventListener('input', updatePreview)
})

// ── Presets ───────────────────────────────────────────────────
const presetSelect    = document.getElementById('presetSelect')
const presetNameInput = document.getElementById('presetName')
const btnSavePreset   = document.getElementById('btnSavePreset')
const btnDeletePreset = document.getElementById('btnDeletePreset')

let allPresets = {}

async function refreshPresets(selectName) {
  const result = await window.themeAPI.loadPresets()
  if (!result.ok) return
  allPresets = result.presets
  presetSelect.innerHTML = '<option value="">— select a theme —</option>'
  for (const name of Object.keys(allPresets)) {
    const opt = document.createElement('option')
    opt.value       = name
    opt.textContent = name
    presetSelect.appendChild(opt)
  }
  if (selectName && allPresets[selectName]) presetSelect.value = selectName
}

function applyPreset(config) {
  // Colour pickers
  const colorFields = [
    'themeCrimson','themeGold','themeEmber',
    'userBubble','aiBubble','composerBg',
    'bgBase','userText','aiText','textMuted',
  ]
  colorFields.forEach(f => {
    const el = document.getElementById(f)
    if (el && config[f]) el.value = config[f]
  })

  // Range sliders
  const rangeFields = [
    'sidebarOpacity','panelOpacity','codeOpacity',
    'userBubbleOpacity','aiBubbleOpacity','composerOpacity',
    'sidebarPosX','sidebarPosY','panelPosX','panelPosY',
  ]
  rangeFields.forEach(f => {
    const el  = document.getElementById(f)
    const lbl = document.getElementById(f + 'Value')
    if (el && config[f] !== undefined) {
      el.value = config[f]
      if (lbl) lbl.textContent = config[f] + '%'
    }
  })

  // Image slots
  const imageSlots = [
    { key: 'sidebarImage', slotId: 'sidebarImageSlot' },
    { key: 'panelImage',   slotId: 'panelImageSlot'   },
    { key: 'bodyImage',    slotId: 'bodyImageSlot'     },
  ]
  imageSlots.forEach(({ key, slotId }) => {
    const slot = document.getElementById(slotId)
    if (config[key]) {
      state[key]       = config[key]
      slot.textContent = '✓ ' + config[key].split(/[\\/]/).pop()
      slot.title       = config[key]
    } else {
      state[key]       = null
      slot.textContent = 'Pick'
      slot.title       = ''
    }
  })

  updatePreview()
}

// Load preset when dropdown changes
presetSelect.addEventListener('change', () => {
  const name = presetSelect.value
  if (name && allPresets[name]) applyPreset(allPresets[name])
})

// Save current config as a named preset
btnSavePreset.addEventListener('click', async () => {
  const name = presetNameInput.value.trim()
  if (!name) { alert('Enter a name for this theme first.'); return }
  const config = gatherConfig()
  const result = await window.themeAPI.savePreset(name, config)
  if (result.ok) {
    await refreshPresets(name)
    presetNameInput.value = ''
  } else {
    alert('Failed to save theme: ' + result.error)
  }
})

// Delete the selected preset
btnDeletePreset.addEventListener('click', async () => {
  const name = presetSelect.value
  if (!name) return
  if (!confirm(`Delete theme "${name}"?`)) return
  const result = await window.themeAPI.deletePreset(name)
  if (result.ok) {
    await refreshPresets()
  } else {
    alert('Failed to delete theme: ' + result.error)
  }
})

// Load saved presets on startup
refreshPresets()
