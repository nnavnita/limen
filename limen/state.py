"""Build the snapshot the browser draws, from what is on disk right now."""

import glob
import json
import os

from . import names, rooms, transcripts, zones

SESSIONS_DIR = os.path.join(rooms.CLAUDE_HOME, "sessions")
PROJECTS_DIR = rooms.PROJECTS_DIR


def _pid_alive(pid):
    """Session files outlive crashed processes, so the pid is the real check."""
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True  # alive, just owned by someone else
    except (OSError, TypeError):
        return False
    return True


def live_sessions():
    sessions = []
    for path in sorted(glob.glob(os.path.join(SESSIONS_DIR, "*.json"))):
        try:
            with open(path) as handle:
                record = json.load(handle)
        except (OSError, ValueError):
            continue
        if not _pid_alive(record.get("pid")):
            continue
        if not record.get("sessionId") or not record.get("cwd"):
            continue
        sessions.append(record)
    return sessions


def _transcript_path(session_id, cwd):
    """Find a session's transcript without trusting the slug encoding."""
    direct = glob.glob(os.path.join(PROJECTS_DIR, "*", session_id + ".jsonl"))
    if direct:
        return direct[0]
    return None


def build_snapshot():
    all_rooms = rooms.discover_rooms()
    rooms_by_cwd = {room["cwd"]: room for room in all_rooms}
    for room in all_rooms:
        room["sessions"] = []

    sessions = []
    taken_names = set()
    for record in live_sessions():
        session_id = record["sessionId"]
        cwd = record["cwd"]

        room = rooms_by_cwd.get(cwd)
        if room is None:
            # Session started somewhere with no transcript folder yet.
            room = {
                "id": "live:" + cwd,
                "cwd": cwd,
                "label": os.path.basename(cwd.rstrip("/")) or "/",
                "scratch": rooms.is_scratch(cwd),
                "exists": os.path.isdir(cwd),
                "docs": rooms.list_docs(cwd),
                "transcripts": 0,
                "sessions": [],
            }
            rooms_by_cwd[cwd] = room
            all_rooms.append(room)

        summary = transcripts.summarise_file(_transcript_path(session_id, cwd))

        session = {
            "id": session_id,
            "pid": record.get("pid"),
            "room_id": room["id"],
            "name": names.unique_name(session_id, taken_names),
            "title": names.job_title(summary.get("tool_counts") or {}),
            "seed": names.sprite_seed(session_id),
            "terminal_name": record.get("name"),
            "status": record.get("status") or "idle",
            "kind": record.get("kind") or "interactive",
            "entrypoint": record.get("entrypoint") or "cli",
            "started_at": record.get("startedAt"),
            "git_branch": summary.get("git_branch"),
            "ai_title": summary.get("ai_title"),
            "last_tool": summary.get("last_tool"),
            "tool_counts": summary.get("tool_counts") or {},
            "todos": summary.get("todos") or [],
            "helpers": summary.get("pending_agents") or [],
            "repo": room["label"],
            "repo_id": room["id"],
            "cwd": cwd,
            "docs": room["docs"],
            "last_activity": summary.get("last_activity"),
        }
        session["zone"] = zones.zone_for(
            session["status"], session["last_tool"], len(session["helpers"]))
        sessions.append(session)
        room["sessions"].append(session_id)

    all_rooms.sort(key=lambda room: (
        not bool(room["sessions"]),  # occupied rooms first
        room["scratch"],
        room["label"].lower(),
    ))
    return {"rooms": all_rooms, "sessions": sessions}
