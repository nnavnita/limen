"""Stable cute names and job titles for sessions."""

import hashlib

CUTE_NAMES = [
    "Pip", "Mossy", "Tuppence", "Juniper", "Waffle", "Bramble", "Clementine",
    "Pickle", "Marlow", "Bibi", "Sprout", "Tansy", "Nutmeg", "Olive",
    "Fennel", "Poppy", "Quill", "Hazel", "Biscuit", "Wren", "Dandelion",
    "Cricket", "Maple", "Pebble", "Saffron", "Tilly", "Bumble", "Clove",
    "Mango", "Fig", "Rue", "Basil", "Cinder", "Doodle", "Elm", "Flint",
    "Ginger", "Hollis", "Indigo", "Jammy", "Kipper", "Lark", "Mushroom",
    "Noodle", "Otter", "Plum", "Quince", "Rosemary", "Sorrel", "Thistle",
    "Umber", "Violet", "Willow", "Yarrow", "Zinnia", "Acorn", "Beetle",
    "Comet", "Drizzle", "Ember", "Frost", "Gable", "Harbour", "Ivy",
]

# Tools grouped by the job they imply.
TITLE_BY_TOOL = {
    "Edit": "the Builder",
    "Write": "the Builder",
    "NotebookEdit": "the Builder",
    "MultiEdit": "the Builder",
    "Read": "the Scout",
    "Grep": "the Scout",
    "Glob": "the Scout",
    "LS": "the Scout",
    "Bash": "the Wrangler",
    "BashOutput": "the Wrangler",
    "KillShell": "the Wrangler",
    "Task": "the Foreman",
    "Agent": "the Foreman",
    "SendMessage": "the Foreman",
    "WebSearch": "the Librarian",
    "WebFetch": "the Librarian",
    "TodoWrite": "the Planner",
    "TaskCreate": "the Planner",
    "TaskUpdate": "the Planner",
    "ExitPlanMode": "the Planner",
    "Skill": "the Tinkerer",
    "ToolSearch": "the Tinkerer",
}

# Shown when a session has not done enough yet to guess honestly.
UNKNOWN_TITLE = "the Newcomer"
MIN_CALLS_FOR_TITLE = 3

# Ties break toward the title that says more about intent.
TITLE_PRIORITY = [
    "the Builder",
    "the Foreman",
    "the Wrangler",
    "the Planner",
    "the Librarian",
    "the Tinkerer",
    "the Scout",
]


def _seed(session_id):
    """Stable 32-bit int for a session id. Same id always gives the same one."""
    digest = hashlib.md5(session_id.encode("utf-8")).digest()
    return int.from_bytes(digest[:4], "big")


def cute_name(session_id):
    return CUTE_NAMES[_seed(session_id) % len(CUTE_NAMES)]


def sprite_seed(session_id):
    """Seed the browser uses to pick hair/skin/shirt colours."""
    return _seed(session_id)


def job_title(tool_counts):
    """Dominant-tool title, or 'the Newcomer' when there is not enough evidence."""
    if not tool_counts:
        return UNKNOWN_TITLE

    totals = {}
    for tool, count in tool_counts.items():
        title = TITLE_BY_TOOL.get(tool)
        if title:
            totals[title] = totals.get(title, 0) + count

    if not totals or sum(totals.values()) < MIN_CALLS_FOR_TITLE:
        return UNKNOWN_TITLE

    best = max(totals.values())
    for title in TITLE_PRIORITY:
        if totals.get(title) == best:
            return title
    return UNKNOWN_TITLE


def unique_name(session_id, taken):
    """Two live sessions must never share a name, or the office gets confusing."""
    base = _seed(session_id)
    for offset in range(len(CUTE_NAMES)):
        candidate = CUTE_NAMES[(base + offset) % len(CUTE_NAMES)]
        if candidate not in taken:
            taken.add(candidate)
            return candidate
    return cute_name(session_id) + " II"
