"""Discover one room per folder Claude Code has worked in."""

import glob
import json
import re
import os
import time

CLAUDE_HOME = os.environ.get("LIMEN_CLAUDE_HOME") or os.path.expanduser("~/.claude")
PROJECTS_DIR = os.path.join(CLAUDE_HOME, "projects")

DOC_LIMIT = 14
DOCS_TTL_SECONDS = 30

_cwd_cache = {}
_docs_cache = {}


def _newest_transcript(project_dir):
    files = glob.glob(os.path.join(project_dir, "*.jsonl"))
    if not files:
        return None
    return max(files, key=os.path.getmtime)


def _cwd_from_transcript(path, nbytes=64 * 1024):
    """The real cwd is recorded in the transcript; the folder slug is lossy."""
    try:
        with open(path, "rb") as handle:
            blob = handle.read(nbytes)
    except OSError:
        return None

    for line in blob.split(b"\n"):
        if b'"cwd"' not in line:
            continue
        try:
            record = json.loads(line)
        except ValueError:
            continue
        if record.get("cwd"):
            return record["cwd"]
    return None


def _slugify(name):
    """Mirror how Claude Code turns a path into a folder name."""
    return re.sub(r"[^A-Za-z0-9]", "-", name)


def _cwd_from_slug(slug, root="/"):
    """Walk the real filesystem to undo the slug.

    Slugging replaces every dot, space and slash with a dash, so the slug alone
    cannot be reversed: `nnavnita-github-io` is both `nnavnita/github/io` and
    `nnavnita.github.io`. Matching each candidate directory's own slug against
    the remaining tokens resolves it whenever the folder still exists.
    """
    tokens = [token for token in slug.split("-") if token]

    def walk(base, index):
        if index >= len(tokens):
            return base
        try:
            children = os.listdir(base)
        except OSError:
            return None
        # Longest match first: prefer `nnavnita.github.io` over `nnavnita`.
        for end in range(len(tokens), index, -1):
            target = "-".join(tokens[index:end])
            for child in children:
                if _slugify(child) != target:
                    continue
                candidate = os.path.join(base, child)
                if not os.path.isdir(candidate):
                    continue
                found = walk(candidate, end)
                if found:
                    return found
        return None

    resolved = walk(root, 0)
    return resolved or "/" + "/".join(tokens)


def resolve_cwd(project_dir):
    slug = os.path.basename(project_dir)
    if slug in _cwd_cache:
        return _cwd_cache[slug]

    transcript = _newest_transcript(project_dir)
    cwd = _cwd_from_transcript(transcript) if transcript else None
    if cwd:
        _cwd_cache[slug] = cwd
        return cwd
    return _cwd_from_slug(slug)  # not cached: a later transcript may do better


def list_docs(cwd):
    """Markdown in the repo root and docs/ — the spines on the bookshelf."""
    now = time.time()
    cached = _docs_cache.get(cwd)
    if cached and now - cached[0] < DOCS_TTL_SECONDS:
        return cached[1]

    docs = []
    if os.path.isdir(cwd):
        patterns = [
            os.path.join(cwd, "*.md"),
            os.path.join(cwd, "docs", "*.md"),
            os.path.join(cwd, "docs", "*", "*.md"),
        ]
        seen = set()
        for pattern in patterns:
            for path in sorted(glob.glob(pattern)):
                if path in seen:
                    continue
                seen.add(path)
                docs.append({
                    "name": os.path.basename(path),
                    "path": os.path.relpath(path, cwd),
                })
                if len(docs) >= DOC_LIMIT:
                    break
            if len(docs) >= DOC_LIMIT:
                break

    _docs_cache[cwd] = (now, docs)
    return docs


def is_scratch(cwd):
    """Temp-dir sessions get a room too, but shouldn't look like a real project."""
    return cwd.startswith("/private/var/folders") or cwd.startswith("/tmp")


def discover_rooms():
    """A room per project folder, sorted so the layout stays put between polls."""
    rooms = []
    for project_dir in sorted(glob.glob(os.path.join(PROJECTS_DIR, "*"))):
        if not os.path.isdir(project_dir):
            continue
        slug = os.path.basename(project_dir)
        cwd = resolve_cwd(project_dir)
        exists = os.path.isdir(cwd)
        transcripts = len(glob.glob(os.path.join(project_dir, "*.jsonl")))
        if not exists and not transcripts:
            continue  # folder is gone and nothing was ever logged there
        rooms.append({
            "id": slug,
            "cwd": cwd,
            "label": os.path.basename(cwd.rstrip("/")) or "/",
            "scratch": is_scratch(cwd),
            "exists": exists,
            "docs": list_docs(cwd),
            "transcripts": transcripts,
        })
    rooms.sort(key=lambda room: (room["scratch"], room["label"].lower()))
    return rooms
