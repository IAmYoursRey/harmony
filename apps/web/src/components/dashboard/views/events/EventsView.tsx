import React, { useState, useEffect, useMemo } from "react";
import {
  Trophy,
  Swords,
  Brain,
  Calendar,
  Users,
  Award,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Sparkles,
  CheckCircle2,
  Globe,
  ExternalLink,
  Search,
  Filter,
  Flame,
  Shield,
  GraduationCap,
  Play,
  ArrowRight,
  ChevronRight,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useData } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";

export interface EventParticipant {
  userId: string;
  name: string;
  role: string;
  schoolName?: string;
  score: number;
  pointsEarned: number;
  completedAt: string;
  isTeacher?: boolean;
  title?: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  type: "game" | "quiz";
  scenarioOrTopic: string;
  pointsReward: number;
  startDate: string;
  endDate: string;
  status: "active" | "upcoming" | "ended";
  mapId?: string;
  createdBy?: {
    id: string;
    name: string;
    role: string;
    schoolName?: string;
  };
  participants: EventParticipant[];
  createdAt?: string;
}

export function EventsView() {
  const { currentUser, currentProfile, refreshProfile } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "game" | "quiz">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "upcoming">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [selectedEventForLeaderboard, setSelectedEventForLeaderboard] = useState<EventItem | null>(null);
  const [leaderboardTab, setLeaderboardTab] = useState<"students" | "teachers">("students");

  // Quick participate challenge modal
  const [activeChallengeEvent, setActiveChallengeEvent] = useState<EventItem | null>(null);
  const [challengeScore, setChallengeScore] = useState(85);
  const [submittingChallenge, setSubmittingChallenge] = useState(false);

  // Create/Edit form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "game" as "game" | "quiz",
    scenarioOrTopic: "",
    pointsReward: 200,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    status: "active" as "active" | "upcoming" | "ended",
  });
  const [savingEvent, setSavingEvent] = useState(false);

  const canEdit =
    currentUser?.role === "teacher" ||
    currentUser?.role === "developer" ||
    currentUser?.role === "dev";

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/events", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setEvents(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (filterType !== "all" && evt.type !== filterType) return false;
      if (filterStatus !== "all" && evt.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = evt.title.toLowerCase().includes(q);
        const matchDesc = evt.description?.toLowerCase().includes(q);
        const matchTopic = evt.scenarioOrTopic?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchTopic) return false;
      }
      return true;
    });
  }, [events, filterType, filterStatus, searchQuery]);

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setFormData({
      title: "",
      description: "",
      type: "game",
      scenarioOrTopic: "Earthquake Evacuation Drill",
      pointsReward: 200,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      status: "active",
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (evt: EventItem) => {
    setEditingEvent(evt);
    setFormData({
      title: evt.title,
      description: evt.description || "",
      type: evt.type,
      scenarioOrTopic: evt.scenarioOrTopic || "",
      pointsReward: evt.pointsReward || 200,
      startDate: evt.startDate?.split("T")[0] || "",
      endDate: evt.endDate?.split("T")[0] || "",
      status: evt.status || "active",
    });
    setIsCreateModalOpen(true);
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/events/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        show("Event deleted successfully", "success");
        setEvents((prev) => prev.filter((e) => e.id !== id));
      } else {
        show("Failed to delete event", "error");
      }
    } catch {
      show("Network error deleting event", "error");
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      show("Please enter an event title", "error");
      return;
    }

    try {
      setSavingEvent(true);
      const token = localStorage.getItem("token");
      const url = editingEvent ? `/api/events/${editingEvent.id}` : "/api/events";
      const method = editingEvent ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        show(editingEvent ? "Event updated!" : "Event created!", "success");
        setIsCreateModalOpen(false);
        fetchEvents();
      } else {
        show("Failed to save event", "error");
      }
    } catch {
      show("Network error saving event", "error");
    } finally {
      setSavingEvent(false);
    }
  };

  const handleParticipate = async (evt: EventItem) => {
    setActiveChallengeEvent(evt);
    setChallengeScore(Math.floor(Math.random() * 20) + 80); // 80 - 100 random default
  };

  const handleSubmitParticipation = async () => {
    if (!activeChallengeEvent) return;
    try {
      setSubmittingChallenge(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/events/${activeChallengeEvent.id}/participate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ score: challengeScore }),
      });

      if (res.ok) {
        const data = await res.json();
        show(data.message, "success");
        setActiveChallengeEvent(null);
        refreshProfile?.();
        fetchEvents();
      } else {
        show("Failed to record participation", "error");
      }
    } catch {
      show("Network error participating", "error");
    } finally {
      setSubmittingChallenge(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-10" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-md">
              <Trophy className="h-3.5 w-3.5 text-amber-300" />
              <span>International & Inter-School Disaster Events</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              Harmony Events & Competitions
            </h1>
            <p className="text-sm text-brand-100/90 leading-relaxed">
              Compete in global disaster simulation challenges, evacuation tournaments, and disaster quizzes.
              Earn points, unlock master badges, and raise your school’s global resilience ranking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {canEdit && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 rounded-xl bg-white text-brand-700 px-5 py-2.5 text-sm font-bold shadow-lg hover:bg-brand-50 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4 text-brand-600" />
                <span>Create New Event</span>
              </button>
            )}
            <button
              onClick={() => navigate("/app/leaderboard")}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 text-sm font-semibold backdrop-blur-md transition-colors"
            >
              <Award className="h-4 w-4 text-amber-300" />
              <span>Global Leaderboard</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/10 pt-6">
          <div>
            <p className="text-xs text-brand-200">Active Events</p>
            <p className="text-2xl font-black font-display text-white">
              {events.filter((e) => e.status === "active").length}
            </p>
          </div>
          <div>
            <p className="text-xs text-brand-200">Total Competitions</p>
            <p className="text-2xl font-black font-display text-white">{events.length}</p>
          </div>
          <div>
            <p className="text-xs text-brand-200">Total Participants</p>
            <p className="text-2xl font-black font-display text-white">
              {events.reduce((acc, e) => acc + (e.participants?.length || 0), 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-brand-200">Total Reward Pool</p>
            <p className="text-2xl font-black font-display text-amber-300">
              {events.reduce((acc, e) => acc + (e.pointsReward || 0), 0)} PTS
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search events, topics, scenarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-brand-100 bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-white placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === "all"
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-ink-600 dark:text-slate-300 border border-brand-100 dark:border-slate-700 hover:bg-brand-50"
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setFilterType("game")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === "game"
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-ink-600 dark:text-slate-300 border border-brand-100 dark:border-slate-700 hover:bg-brand-50"
            }`}
          >
            <Swords className="h-3.5 w-3.5" />
            Game Challenges
          </button>
          <button
            onClick={() => setFilterType("quiz")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === "quiz"
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-ink-600 dark:text-slate-300 border border-brand-100 dark:border-slate-700 hover:bg-brand-50"
            }`}
          >
            <Brain className="h-3.5 w-3.5" />
            Quiz Challenges
          </button>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600 mb-3" />
          <p className="text-sm font-medium text-ink-500">Loading active competitions...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center border border-dashed border-brand-200 dark:border-slate-700 dark:bg-slate-900/40">
          <Trophy className="h-12 w-12 text-brand-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
            No Events Found
          </h3>
          <p className="text-xs text-ink-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "No events match your search criteria. Try a different query."
              : "There are currently no events matching this filter."}
          </p>
          {canEdit && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" /> Create First Event
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredEvents.map((evt) => {
            const hasJoined = evt.participants?.some((p) => p.userId === currentUser?.id);
            const userParticipant = evt.participants?.find((p) => p.userId === currentUser?.id);
            const studentParticipants = evt.participants?.filter((p) => !p.isTeacher) || [];
            const teacherParticipants = evt.participants?.filter((p) => p.isTeacher) || [];

            return (
              <div
                key={evt.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-brand-100 bg-white/70 backdrop-blur-xl p-6 shadow-glass transition-all hover:-translate-y-1 hover:shadow-glass-lg dark:border-slate-800 dark:bg-slate-900/70"
              >
                {/* Header Tag Bar */}
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          evt.type === "game"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                            : "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
                        }`}
                      >
                        {evt.type === "game" ? (
                          <Swords className="h-3.5 w-3.5" />
                        ) : (
                          <Brain className="h-3.5 w-3.5" />
                        )}
                        {evt.type === "game" ? "Game Challenge" : "Question Quiz"}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          evt.status === "active"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {evt.status === "active" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        {evt.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(evt)}
                            className="p-1.5 rounded-lg text-ink-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Event"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(evt.id)}
                            className="p-1.5 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Title & Topic */}
                  <h3 className="font-display text-lg font-extrabold text-ink-900 dark:text-white group-hover:text-brand-600 transition-colors">
                    {evt.title}
                  </h3>
                  <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mt-0.5 flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" /> {evt.scenarioOrTopic}
                  </p>

                  <p className="text-sm text-ink-600 dark:text-slate-300 mt-2.5 line-clamp-2 leading-relaxed">
                    {evt.description}
                  </p>

                  {/* Badges / Highlights */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      +{evt.pointsReward} Points
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-ink-600 dark:bg-slate-800 dark:text-slate-300">
                      <Users className="h-3.5 w-3.5" />
                      {studentParticipants.length} Students &bull; {teacherParticipants.length} Teachers
                    </div>
                    {evt.createdBy && (
                      <div className="flex items-center gap-1 text-[11px] text-ink-400 dark:text-slate-500">
                        <span>By: {evt.createdBy.name}</span>
                        {evt.createdBy.schoolName && <span>({evt.createdBy.schoolName})</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-6 pt-4 border-t border-brand-100/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      setSelectedEventForLeaderboard(evt);
                      setLeaderboardTab("students");
                    }}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1 underline underline-offset-4"
                  >
                    <span>Leaderboard & Showcase</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    {currentUser?.role === "teacher" ? (
                      <button
                        onClick={() => handleParticipate(evt)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          hasJoined
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300"
                            : "bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95"
                        }`}
                      >
                        <GraduationCap className="h-3.5 w-3.5" />
                        <span>{hasJoined ? "Retake (Teacher)" : "Participate as Teacher"}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleParticipate(evt)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          hasJoined
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-brand-600 text-white shadow-md hover:bg-brand-700 active:scale-95"
                        }`}
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>{hasJoined ? "Re-attempt Challenge" : "Join Challenge"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leaderboard & Teacher Showcase Modal */}
      {selectedEventForLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-900 border border-brand-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">
                    {selectedEventForLeaderboard.title}
                  </h3>
                </div>
                <p className="text-xs text-ink-500 dark:text-slate-400 mt-1">
                  Topic: {selectedEventForLeaderboard.scenarioOrTopic} &bull; Reward: +{selectedEventForLeaderboard.pointsReward} PTS
                </p>
              </div>
              <button
                onClick={() => setSelectedEventForLeaderboard(null)}
                className="p-1.5 rounded-lg text-ink-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Category Tabs: Student Ranking vs Teacher Showcase */}
            <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl my-4">
              <button
                onClick={() => setLeaderboardTab("students")}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  leaderboardTab === "students"
                    ? "bg-white dark:bg-slate-700 text-brand-600 shadow-sm"
                    : "text-ink-600 dark:text-slate-400"
                }`}
              >
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span>Student Leaderboard ({selectedEventForLeaderboard.participants?.filter((p) => !p.isTeacher).length || 0})</span>
              </button>
              <button
                onClick={() => setLeaderboardTab("teachers")}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  leaderboardTab === "teachers"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm"
                    : "text-ink-600 dark:text-slate-400"
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5 text-indigo-500" />
                <span>Teacher Participants ({selectedEventForLeaderboard.participants?.filter((p) => p.isTeacher).length || 0})</span>
              </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {leaderboardTab === "students" ? (
                // Student Leaderboard
                (() => {
                  const studentList = (selectedEventForLeaderboard.participants || [])
                    .filter((p) => !p.isTeacher)
                    .sort((a, b) => b.score - a.score);

                  if (studentList.length === 0) {
                    return (
                      <div className="py-12 text-center text-sm text-ink-400">
                        No students have submitted this challenge yet. Be the first to rank!
                      </div>
                    );
                  }

                  return studentList.map((st, idx) => (
                    <div
                      key={st.userId || idx}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                        idx === 0
                          ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20"
                          : idx === 1
                          ? "border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30"
                          : idx === 2
                          ? "border-amber-100 bg-amber-50/20 dark:border-amber-900/10 dark:bg-amber-950/10"
                          : "border-slate-100 bg-white dark:border-slate-800/60 dark:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${
                            idx === 0
                              ? "bg-amber-500 text-white shadow-sm"
                              : idx === 1
                              ? "bg-slate-400 text-white"
                              : idx === 2
                              ? "bg-amber-700 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-ink-500 font-mono"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-ink-900 dark:text-white">
                            {st.name}
                          </p>
                          <p className="text-xs text-ink-500 dark:text-slate-400">
                            {st.schoolName || "School"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-extrabold text-brand-600 dark:text-brand-400">
                          {st.score}% Score
                        </p>
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          +{st.pointsEarned} PTS
                        </p>
                      </div>
                    </div>
                  ));
                })()
              ) : (
                // Teacher Participants (Separate Showcase)
                (() => {
                  const teacherList = (selectedEventForLeaderboard.participants || []).filter(
                    (p) => p.isTeacher
                  );

                  if (teacherList.length === 0) {
                    return (
                      <div className="py-12 text-center text-sm text-ink-400">
                        No teachers have joined this event challenge yet.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-xs text-indigo-700 dark:text-indigo-300">
                        <strong>Note:</strong> Teachers participate to verify drills, test readiness, and support students. Teachers receive a Certificate & Safety Coach Title, and do not displace student leaderboard ranks.
                      </div>
                      {teacherList.map((t, idx) => (
                        <div
                          key={t.userId || idx}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-indigo-100 bg-white dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                              <GraduationCap className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-ink-900 dark:text-white">
                                  {t.name}
                                </p>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                                  Teacher Badge
                                </span>
                              </div>
                              <p className="text-xs text-ink-500 dark:text-slate-400">
                                {t.schoolName || "School"} &bull; Completed Challenge
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Certified Drill
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Participate / Enter Challenge Modal */}
      {activeChallengeEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-900 border border-brand-100 dark:border-slate-800">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {activeChallengeEvent.type === "game" ? (
                  <Swords className="h-5 w-5 text-amber-500" />
                ) : (
                  <Brain className="h-5 w-5 text-sky-500" />
                )}
                <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
                  {currentUser?.role === "teacher"
                    ? "Teacher Event Verification"
                    : "Complete Challenge Simulation"}
                </h3>
              </div>
              <button
                onClick={() => setActiveChallengeEvent(null)}
                className="p-1 rounded-lg text-ink-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="rounded-xl bg-brand-50 p-4 dark:bg-slate-800/60 border border-brand-100 dark:border-slate-700">
                <h4 className="font-bold text-sm text-ink-900 dark:text-white">
                  {activeChallengeEvent.title}
                </h4>
                <p className="text-xs text-ink-600 dark:text-slate-300 mt-1">
                  Topic: {activeChallengeEvent.scenarioOrTopic}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-ink-500">Reward:</span>
                  <span className="font-bold text-amber-600">
                    +{activeChallengeEvent.pointsReward} Points
                  </span>
                </div>
              </div>

              {currentUser?.role === "teacher" ? (
                <div className="text-xs text-slate-600 dark:text-slate-300 p-3 bg-indigo-50/70 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                  <p className="font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                    Teacher Participation Notice
                  </p>
                  As a registered teacher, completing this challenge records your safety verification and showcases your school’s participation. Teachers are not listed in student rank competition.
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-ink-700 dark:text-slate-300">
                    Challenge Performance Score: {challengeScore}%
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={challengeScore}
                    onChange={(e) => setChallengeScore(Number(e.target.value))}
                    className="w-full accent-brand-600"
                  />
                  <div className="flex justify-between text-[11px] text-ink-400">
                    <span>50% (Passing)</span>
                    <span>100% (Flawless Evacuation)</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setActiveChallengeEvent(null)}
                className="px-4 py-2 text-xs font-bold text-ink-500 hover:text-ink-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitParticipation}
                disabled={submittingChallenge}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                {submittingChallenge ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Submit & Earn Points</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Event Modal (Teacher & Dev only) */}
      {isCreateModalOpen && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-900 border border-brand-100 dark:border-slate-800">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-brand-600" />
                <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
                  {editingEvent ? "Edit Event" : "Create New Event"}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-ink-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="py-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-ink-700 dark:text-slate-300 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National School Evacuation Sprint 2026"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the challenge goals, instructions, or rules for students..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-ink-700 dark:text-slate-300 mb-1">
                    Event Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as "game" | "quiz" })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="game">Game Challenge (Simulator)</option>
                    <option value="quiz">Question Challenge (Quiz)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-ink-700 dark:text-slate-300 mb-1">
                    Points Reward
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={1000}
                    value={formData.pointsReward}
                    onChange={(e) =>
                      setFormData({ ...formData, pointsReward: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink-700 dark:text-slate-300 mb-1">
                  Scenario or Topic Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Earthquake Evacuation Simulator or Tsunami IQ"
                  value={formData.scenarioOrTopic}
                  onChange={(e) =>
                    setFormData({ ...formData, scenarioOrTopic: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-ink-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink-700 dark:text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-ink-500 hover:text-ink-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {savingEvent ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>{editingEvent ? "Update Event" : "Create Event"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventsView;
