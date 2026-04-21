# freewrite

A distraction-free timed writing tool. Set a timer, start writing, don't stop.

## Usage

Open `index.html` in a browser. No build step, no dependencies.

1. Pick a duration (5 / 10 / 15 / 25 / 30 min) or enter a custom one
2. Press **Start Writing** or hit **Enter**
3. Write until time runs out

## Features

- Timer counts down in the HUD with a matching favicon progress ring
- Tab switching auto-pauses the session and resumes on return
- HUD and word count fade after 3s of inactivity — stays out of your way
- Draft auto-saves to `localStorage`; survives accidental refreshes
- Done screen shows word count, elapsed time, and WPM
- Copy or download your text as `.txt`

## Keyboard

| Key | Action |
|-----|--------|
| `Enter` | Start session (from setup screen) |

## Files

```
freewriting/
  index.html       — markup
  app.js           — all logic
  style.css        — styles
  freewriting.png  — app icon / static favicon fallback
  README.md
```
