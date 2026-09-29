"""Read the tail of a session transcript without parsing the whole file.

Transcripts are append-only JSONL that grow for the life of a session, so the
poll loop seeks to the end instead of re-reading megabytes every second.
"""

import json
import os

# Large tool results can crowd every tool_use out of a small window, which makes
# a busy session look like it has done nothing. Read enough to see real history.
TAIL_BYTES = 256 * 1024

# Tools that spawn a helper working alongside the session.
SUBAGENT_TOOLS = {"Task", "Agent"}


def tail_records(path, nbytes=TAIL_BYTES):
    """Parse the last nbytes of a JSONL file into records, newest last."""
    try:
        size = os.path.getsize(path)
    except OSError:
        return []

    start = max(0, size - nbytes)
    try:
        with open(path, "rb") as handle:
            handle.seek(start)
            blob = handle.read()
    except OSError:
        return []

    lines = blob.split(b"\n")
    if start > 0 and lines:
        lines.pop(0)  # first line is almost certainly cut in half

    records = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            records.append(json.loads(line))
        except ValueError:
            continue
    return records


def _content_blocks(record):
    message = record.get("message")
    if not isinstance(message, dict):
        return []
    content = message.get("content")
    return content if isinstance(content, list) else []


def summarise(records):
    """Pull everything a room needs to draw from a transcript tail."""
    summary = {
        "git_branch": None,
        "ai_title": None,
        "last_prompt": None,
        "last_tool": None,
        "tool_counts": {},
        "todos": [],
        "pending_agents": [],
        "last_activity": None,
    }

    started_agents = {}
    finished_agent_ids = set()

    for record in records:
        if record.get("gitBranch"):
            summary["git_branch"] = record["gitBranch"]
        if record.get("timestamp"):
            summary["last_activity"] = record["timestamp"]

        kind = record.get("type")
        if kind == "ai-title" and record.get("aiTitle"):
            summary["ai_title"] = record["aiTitle"]
        if kind == "last-prompt" and record.get("lastPrompt"):
            summary["last_prompt"] = record["lastPrompt"]

        for block in _content_blocks(record):
            if not isinstance(block, dict):
                continue
            block_type = block.get("type")

            if block_type == "tool_use":
                name = block.get("name") or "?"
                summary["last_tool"] = name
                summary["tool_counts"][name] = summary["tool_counts"].get(name, 0) + 1

                if name in SUBAGENT_TOOLS:
                    payload = block.get("input") or {}
                    started_agents[block.get("id")] = {
                        "id": block.get("id"),
                        "kind": payload.get("subagent_type") or "general-purpose",
                        "description": payload.get("description") or "working",
                    }
                elif name == "TodoWrite":
                    payload = block.get("input") or {}
                    todos = payload.get("todos")
                    if isinstance(todos, list):
                        summary["todos"] = [
                            {
                                "content": str(item.get("content", ""))[:80],
                                "status": item.get("status", "pending"),
                            }
                            for item in todos
                            if isinstance(item, dict)
                        ]

            elif block_type == "tool_result":
                finished_agent_ids.add(block.get("tool_use_id"))

    summary["pending_agents"] = [
        agent for agent_id, agent in started_agents.items()
        if agent_id not in finished_agent_ids
    ]
    return summary


# Transcripts only grow, so a snapshot is still valid until the file changes.
_summary_cache = {}


def summarise_file(path):
    """Summarise a transcript, reusing the last result while the file is unchanged."""
    if not path:
        return {}
    try:
        stat = os.stat(path)
    except OSError:
        return {}

    stamp = (stat.st_size, stat.st_mtime_ns)
    cached = _summary_cache.get(path)
    if cached and cached[0] == stamp:
        return cached[1]

    summary = summarise(tail_records(path))
    _summary_cache[path] = (stamp, summary)
    return summary
