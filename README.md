# Claude Theme Editor


# IMPORTANT: MAY 18TH IS THE DAY THIS GOT 'NUKED'
# WILL TRY TO FIX IT
# YOU'VE BEEN WARNED

An unofficial desktop tool for customizing the visual appearance of the Claude desktop app — colors, backgrounds, opacity, images, all with a live preview. Built by **Meritas**.

> ⚠️ **This tool modifies Claude's internal application files. Read the disclaimer section before using it.**

---

## Requirements

- Windows 10 / 11
- Claude desktop app installed
- Administrator rights (the app will prompt for them)

---

## Installation

1. Download the latest release from the Releases page
2. Run the installer (or the `.exe` directly if using the portable build)
3. When Windows asks if you want to allow the app to make changes — click **Yes**. It needs admin rights to modify Claude's files.

---

## How to Use

### 1. Customize your theme

Use the left sidebar to adjust your theme:

- **Themes** — save and load your own presets. Type a name and hit Save to store the current settings. Switch between saved themes from the dropdown anytime.
- **Palette** — the three core brand colors (crimson, gold, ember) that flow through the whole UI.
- **Bubbles & Composer** — colors for your chat bubbles and the message input bar.
- **Text & Surfaces** — base background color, user text, AI text, and muted/secondary text.
- **Images** — set background images for the right panel, left sidebar, and the main body wallpaper. Click **Pick** to browse for an image file. Use the **offset X / Y** sliders to reposition each image to your liking.
- **Opacities** — control how transparent each panel is, so your background images show through at the right intensity.

The **preview panel** on the right updates live as you make changes.

### 2. Save a preset (optional)

Once you're happy with a combination, type a name in the Themes section and hit **Save**. Your presets persist between sessions and can be loaded or deleted any time from the dropdown.

### 3. Export CSS (optional)

Hit **Export CSS** to save the resolved stylesheet to your Desktop as `custom-resolved.css`. Useful for inspecting exactly what will be injected into Claude before committing.

### 4. Apply to Claude

Hit **Apply to Claude**. The app will:

1. Build the final stylesheet with your settings
2. Locate your Claude installation
3. Kill Claude if it's running
4. Back up Claude's original `app.asar` (once — subsequent applies always restore from this backup)
5. Inject the theme
6. Write the patched files back

Once it's done, launch Claude manually and your theme will be active.

---

## Notes

- **Claude updates will wipe your theme.** Any time Claude auto-updates, you'll need to re-apply. Just open the editor and hit Apply again — your last preset is still there.
- **A backup is created automatically** the first time you apply (`app.asar.bak` in Claude's resources folder). If anything ever goes wrong, you can restore it manually.
- **Images are embedded** directly into the CSS as base64, so they work without any external files once applied.
- **Run as administrator** — the app requires admin rights to write to Claude's installation directory. If the apply step fails with a permissions error, make sure you launched the exe as admin.

---

## Disclaimer

This tool modifies Claude's internal application files (`app.asar`). It is **unofficial** and not supported or endorsed by Anthropic in any way.

By using it you accept that:

- You might break the Claude desktop app and need to reinstall it
- Claude updates will overwrite your theme
- You're doing this at your own risk

Always keep the automatically created `app.asar.bak` backup accessible in case you need to restore.

---

## Building from Source

```bash
npm install
npm run dist
```

The compiled output lands in `dist/`.

---

*Made by Meritas*
