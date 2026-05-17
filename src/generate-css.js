function generateCSS(config) {
  // Convert 0-100 slider to 0.00-1.00
  const pct = (val) => (parseInt(val) / 100).toFixed(2)

  // Convert a file path to a CSS url() — handles Windows backslashes
  const toUrl = (filePath, fallback) => {
    if (!filePath) return fallback
    const clean = filePath.replace(/\\/g, '/')
    return `url("${clean}")`
  }

  return `:root {
  /* ── Colors ── */
  --theme-crimson:  ${config.themeCrimson};
  --theme-gold:     ${config.themeGold};
  --theme-ember:    ${config.themeEmber};

  /* ── Elements ── */
  --theme-user-bubble:  ${config.userBubble};
  --theme-ai-bubble:    ${config.aiBubble};
  --theme-composer-bg:  ${config.composerBg};

  /* ── Images ── */
  --theme-body-image:    ${toUrl(config.bodyImage,    'none')};
  --theme-sidebar-image: ${toUrl(config.sidebarImage, 'none')};
  --theme-panel-image:   ${toUrl(config.panelImage,   'none')};

  /* ── Opacities ── */
  --theme-sidebar-opacity: ${pct(config.sidebarOpacity)};
  --theme-panel-opacity:   ${pct(config.panelOpacity)};
  --theme-code-opacity:    ${pct(config.codeOpacity)};

  /* ── Element opacities ── */
  --theme-user-bubble-opacity:  ${pct(config.userBubbleOpacity)};
  --theme-ai-bubble-opacity:    ${pct(config.aiBubbleOpacity)};
  --theme-composer-opacity:     ${pct(config.composerOpacity)};

  /* ── Text & Surfaces ── */
  --theme-bg-base:     ${config.bgBase};
  --theme-user-text:   ${config.userText};
  --theme-ai-text:     ${config.aiText};
  --theme-text-muted:  ${config.textMuted};
}`
}

module.exports = { generateCSS }