# limen

A live 2D office for your Claude Code sessions.

Every session running on your machine becomes a little person working in a
shared open-plan office. They have a cute name, a job title inferred from what
they're actually doing, and they walk between zones as their work changes.
Sessions waiting on your input go and stand at the water cooler, chatting.

## Run it

```sh
./run.sh
```

Opens <http://127.0.0.1:4173>. No dependencies — Python 3 standard library only.

```sh
./run.sh --port 8080 --no-open
```

## The floor plan

| Zone | Who's in it |
|---|---|
| **Open plan** | Heads-down work — `Edit`, `Write`, `Bash`. Desks are grouped into clusters, one per repo, with the repo name on a placard. |
| **Research library** | Looking things up — `Read`, `Grep`, `Glob`, `LS`, `WebSearch`, `WebFetch`. The shelves are the markdown docs of whichever repos are active. |
| **Meeting room** | Planning and delegating — any session with subagents in flight, or whose last tool was `Task`, `TodoWrite`, `ExitPlanMode`. The bulletin board here is the live todo list. |
| **Water cooler** | Idle sessions — the ones waiting on *you*. They pair off and make small talk. |

An idle session goes to the cooler no matter what it was doing. The rest is
decided by the most recent tool call. All of it is one dict per zone in
`limen/zones.py` if you want different rules.

## Reading the office

| You see | It means |
|---|---|
| Someone typing at a desk | Working right now |
| Someone at the water cooler | Waiting on your input |
| A thought bubble | The tool that session is using this second |
| Small robots beside someone | Subagents that session has in flight |
| Coloured placard over a desk cluster | Which repo those desks belong to |
| A dark zone | Nobody in there |

Click a zone to step inside, `Esc` to pull back. Hover anyone for their repo,
branch, session title and tool counts.

Job titles come from the dominant tool in a session's recent calls. With fewer
than three tool calls to go on it says **the Newcomer** rather than guessing.

## Where the data comes from

Read-only, from `~/.claude`:

- `sessions/<pid>.json` — which sessions are live, and whether each is busy or
  idle. The pid is checked with a signal, so crashed sessions don't leave ghosts.
- `projects/<slug>/<session>.jsonl` — the last 64KB of each live session's
  transcript, for git branch, current tool, todos, and in-flight subagents.
- The repo folders themselves — markdown files for the library shelves.

Nothing is written to `~/.claude`, and nothing leaves your machine.

## Tests

```sh
python3 -m unittest discover -s tests
```

Point the server at a fixture instead of your real home with
`LIMEN_CLAUDE_HOME=/path/to/fake ./run.sh`.
