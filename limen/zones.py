"""Which part of the office a session belongs in, based on what it is doing."""

DESKS = "desks"
LIBRARY = "library"
MEETING = "meeting"
COOLER = "cooler"

ZONE_ORDER = [DESKS, LIBRARY, MEETING, COOLER]

ZONE_LABELS = {
    DESKS: "open plan",
    LIBRARY: "research library",
    MEETING: "meeting room",
    COOLER: "water cooler",
}

# Looking things up happens in the library.
RESEARCH_TOOLS = {"Read", "Grep", "Glob", "LS", "WebSearch", "WebFetch", "ToolSearch"}

# Planning and delegating happen in the meeting room.
MEETING_TOOLS = {"Task", "Agent", "TodoWrite", "TaskCreate", "TaskUpdate", "ExitPlanMode", "SendMessage"}


def zone_for(status, last_tool, helper_count):
    """Idle sessions are on a break; the rest go where their current tool says."""
    if status != "busy":
        return COOLER
    if helper_count:
        return MEETING            # running subagents is a meeting by any other name
    if last_tool in MEETING_TOOLS:
        return MEETING
    if last_tool in RESEARCH_TOOLS:
        return LIBRARY
    return DESKS
