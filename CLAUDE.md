# limen

Live 2D office visualisation of running Claude Code sessions. One shared
open-plan floor with four zones; each live session is a character who walks to
the zone matching what it is currently doing. See `README.md` for the rules.

## Stack

Python 3 **standard library only** — no pip, no `requirements.txt`, no build
step. Frontend is vanilla ES modules and one `<canvas>`. Keep it that way: the
whole point is that `./run.sh` works on any machine with python3, years from now.

## Layout

| Path | Responsibility |
|---|---|
| `limen/rooms.py` | Find project folders, resolve real cwd, list docs |
| `limen/transcripts.py` | Tail a session's JSONL, summarise it |
| `limen/zones.py` | Which zone a session belongs in |
| `limen/names.py` | Cute names, job titles |
| `limen/state.py` | Assemble the snapshot the browser draws |
| `limen/server.py` | `http.server`: `/api/state` + static files |
| `web/js/sprites.js` | Every character sprite, drawn in code |
| `web/js/props.js` | Furniture (shelves, bulletin board, desk, cooler…) |
| `web/js/zones.js` | Floor plan, zone scenery, desk clustering |
| `web/js/font.js` | Bitmap font, built at runtime from the system monospace |
| `web/js/signage.js` | In-world text: signs, placards, plates, speech bubbles |
| `web/js/chat.js` | Water-cooler small talk |
| `web/js/characters.js` | Actor movement, zone transitions, animation |
| `web/js/main.js` | Camera, render loop, polling, hover |

## Things that will bite you

- **Never write to `~/.claude`.** This tool is strictly a reader. Tests use
  `LIMEN_CLAUDE_HOME` to point at a fixture.
- **Folder slugs are lossy.** `~/.claude/projects/` replaces `.`, ` ` and `/`
  all with `-`, so `nnavnita-github-io` is ambiguous. `rooms._cwd_from_slug`
  walks the real filesystem to resolve it; prefer the `cwd` recorded inside a
  transcript when one exists.
- **Session files outlive dead processes.** Always check the pid is alive.
- **Transcripts grow without bound.** Only ever read the tail.
- **Don't infer more than the data supports.** Job titles fall back to
  "the Newcomer" below three tool calls, and subagents are only drawn when a
  `Task` call is genuinely still in flight. Cute must not mean made up.
- Data polls at 1Hz; the render loop runs at 60fps and interpolates. Keep those
  two clocks separate or sprites teleport once a second.
- **Keep the pixels whole.** Camera zoom snaps to integers and the transform is
  rounded, because a fractional scale smears the art. All in-world text goes
  through `font.js`, never `ctx.fillText` — the canvas font is antialiased and
  looks wrong next to the sprites. Gradients are banded for the same reason.
- Labels are wider than the gap between characters, so name plates only render
  for the hovered character; the side panel is what lists everyone.
- Chrome freezes `requestAnimationFrame` in occluded windows, which is where a
  dashboard usually lives — hence the `schedule()` fallback in `main.js`.

## Tests

```sh
python3 -m unittest discover -s tests
```
