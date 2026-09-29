"""Tests for the parts that read the disk. Run: python3 -m unittest discover tests"""

import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from limen import names, rooms, transcripts, zones


class JobTitles(unittest.TestCase):
    def test_dominant_tool_wins(self):
        self.assertEqual(names.job_title({"Edit": 9, "Read": 2}), "the Builder")
        self.assertEqual(names.job_title({"Grep": 4, "Read": 3}), "the Scout")

    def test_refuses_to_guess_without_evidence(self):
        self.assertEqual(names.job_title({}), names.UNKNOWN_TITLE)
        self.assertEqual(names.job_title({"Read": 2}), names.UNKNOWN_TITLE)

    def test_unknown_tools_are_ignored(self):
        self.assertEqual(names.job_title({"SomeFutureTool": 40}), names.UNKNOWN_TITLE)

    def test_names_are_stable_per_session(self):
        session = "16030bd0-7774-43b8-9da8-9d18d4b1a85d"
        self.assertEqual(names.cute_name(session), names.cute_name(session))

    def test_live_sessions_never_share_a_name(self):
        taken = set()
        first = names.unique_name("aaaa", taken)
        second = names.unique_name("aaaa", taken)   # same id, already used
        self.assertNotEqual(first, second)


class TranscriptTail(unittest.TestCase):
    def write(self, records):
        handle = tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False)
        for record in records:
            handle.write(json.dumps(record) + "\n")
        handle.close()
        self.addCleanup(os.unlink, handle.name)
        return handle.name

    def test_skips_the_half_line_at_the_seek_point(self):
        path = self.write([{"type": "user", "cwd": "/a", "pad": "x" * 500} for _ in range(20)])
        records = transcripts.tail_records(path, nbytes=900)
        self.assertTrue(records)
        self.assertTrue(all(r.get("type") == "user" for r in records))

    def test_ignores_corrupt_lines(self):
        path = self.write([{"type": "user", "cwd": "/a"}])
        with open(path, "a") as handle:
            handle.write("{not json\n")
        self.assertEqual(len(transcripts.tail_records(path)), 1)

    def test_missing_file_is_not_an_error(self):
        self.assertEqual(transcripts.tail_records("/nope/nothing.jsonl"), [])

    def test_summary_pulls_branch_title_tools_and_todos(self):
        todos = [{"content": "ship it", "status": "pending"}]
        records = [
            {"type": "ai-title", "aiTitle": "Wire up parking bays"},
            {"type": "user", "gitBranch": "feat/bays", "timestamp": "2026-09-29T10:00:00Z"},
            {"type": "assistant", "message": {"content": [
                {"type": "tool_use", "id": "1", "name": "Edit", "input": {}},
                {"type": "tool_use", "id": "2", "name": "TodoWrite", "input": {"todos": todos}},
            ]}},
        ]
        summary = transcripts.summarise(records)
        self.assertEqual(summary["git_branch"], "feat/bays")
        self.assertEqual(summary["ai_title"], "Wire up parking bays")
        self.assertEqual(summary["last_tool"], "TodoWrite")
        self.assertEqual(summary["tool_counts"], {"Edit": 1, "TodoWrite": 1})
        self.assertEqual(summary["todos"], [{"content": "ship it", "status": "pending"}])

    def test_only_unfinished_subagents_count_as_helpers(self):
        records = [{"type": "assistant", "message": {"content": [
            {"type": "tool_use", "id": "a1", "name": "Task",
             "input": {"subagent_type": "Explore", "description": "find callers"}},
            {"type": "tool_use", "id": "a2", "name": "Task",
             "input": {"subagent_type": "Plan", "description": "sketch it"}},
        ]}}, {"type": "user", "message": {"content": [
            {"type": "tool_result", "tool_use_id": "a1"},
        ]}}]
        helpers = transcripts.summarise(records)["pending_agents"]
        self.assertEqual([h["description"] for h in helpers], ["sketch it"])


class Zoning(unittest.TestCase):
    def test_idle_sessions_take_a_break(self):
        # Idle beats everything: waiting on the user is a break, whatever the tool was.
        self.assertEqual(zones.zone_for("idle", "Edit", 0), zones.COOLER)
        self.assertEqual(zones.zone_for("idle", "Task", 3), zones.COOLER)

    def test_subagents_pull_you_into_the_meeting_room(self):
        self.assertEqual(zones.zone_for("busy", "Edit", 2), zones.MEETING)

    def test_planning_tools_are_a_meeting(self):
        self.assertEqual(zones.zone_for("busy", "TodoWrite", 0), zones.MEETING)
        self.assertEqual(zones.zone_for("busy", "Task", 0), zones.MEETING)

    def test_lookup_tools_are_the_library(self):
        for tool in ("Read", "Grep", "Glob", "WebSearch"):
            self.assertEqual(zones.zone_for("busy", tool, 0), zones.LIBRARY)

    def test_everything_else_is_a_desk(self):
        for tool in ("Edit", "Write", "Bash", None, "SomeFutureTool"):
            self.assertEqual(zones.zone_for("busy", tool, 0), zones.DESKS)


class SlugResolution(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp()
        self.addCleanup(__import__("shutil").rmtree, self.root, True)

    def test_dots_and_spaces_survive_the_round_trip(self):
        for name in ["nnavnita.github.io", "The Apothecary Diaries", "idiom-disambiguation"]:
            os.makedirs(os.path.join(self.root, "dev", name), exist_ok=True)

        for name in ["nnavnita.github.io", "The Apothecary Diaries", "idiom-disambiguation"]:
            slug = rooms._slugify(os.path.join("dev", name)).lstrip("-")
            resolved = rooms._cwd_from_slug(slug, root=self.root)
            self.assertEqual(resolved, os.path.join(self.root, "dev", name))

    def test_falls_back_to_a_plain_path_when_the_folder_is_gone(self):
        resolved = rooms._cwd_from_slug("Users-someone-deleted", root=self.root)
        self.assertEqual(resolved, "/Users/someone/deleted")


if __name__ == "__main__":
    unittest.main()
