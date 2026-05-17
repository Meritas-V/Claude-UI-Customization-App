const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('themeAPI', {
  pickImage:       ()             => ipcRenderer.invoke('pick-image'),
  exportCss:       (config)       => ipcRenderer.invoke('export-css', config),
  compileAndApply: (config)       => ipcRenderer.invoke('compile-and-apply', config),
  patchClaude:     (config)       => ipcRenderer.invoke('patch-claude', config),
  onPatchLog:      (cb)           => ipcRenderer.on('patch-log', (_, entry) => cb(entry)),
  // Presets
  savePreset:      (name, config) => ipcRenderer.invoke('save-preset', { name, config }),
  loadPresets:     ()             => ipcRenderer.invoke('load-presets'),
  deletePreset:    (name)         => ipcRenderer.invoke('delete-preset', name),
})