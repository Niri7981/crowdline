"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { EventSelectionSection } from "@/components/landing/EventSelectionSection";
import { AgentSelectionSection } from "@/components/landing/AgentSelectionSection";
import { BattlePreviewSection } from "@/components/landing/BattlePreviewSection";
import { SectionTransition } from "@/components/landing/SectionTransition";
import {
  MOCK_EVENTS,
  type LandingEvent,
  type LandingEventCategory,
} from "@/lib/mocks/landing-demo-data";
import { useLandingAgents } from "@/lib/landing/use-landing-agents";
import {
  createDemoRoundState,
  writeStoredDemoRound,
} from "@/lib/landing/demo-round-storage";
import type { RoundState } from "@/lib/types/round";

type ApiError = {
  error?: string;
};

type EventCategoryFilter = LandingEventCategory | "All";

const EVENT_WINDOW_SIZE = 3;
const EVENT_CATEGORY_FILTERS: EventCategoryFilter[] = [
  "All",
  "Crypto",
  "Finance",
  "Sports",
  "DeFi",
  "Macro",
  "Social",
];

async function createRound(input: { agentIds: string[]; eventId: string }) {
  const response = await fetch("/api/round", {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(payload?.error ?? "Failed to create duel round.");
  }

  return (await response.json()) as RoundState;
}

function getFilteredEvents(category: EventCategoryFilter) {
  if (category === "All") {
    return MOCK_EVENTS;
  }

  return MOCK_EVENTS.filter((event) => event.category === category);
}

function getVisibleEvents(events: LandingEvent[], startIndex: number) {
  if (events.length <= EVENT_WINDOW_SIZE) {
    return events;
  }

  return Array.from({ length: EVENT_WINDOW_SIZE }, (_, offset) => {
    const eventIndex = (startIndex + offset) % events.length;
    return events[eventIndex];
  });
}

export default function HomePage() {
  const router = useRouter();
  const {
    agents,
    errorMessage: agentErrorMessage,
    isLoading: isLoadingAgents,
    refreshAgents,
  } = useLandingAgents();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreating, startCreateTransition] = useTransition();

  const [selectedEventId, setSelectedEventId] = useState<string>(MOCK_EVENTS[0].id);
  const [eventWindowStart, setEventWindowStart] = useState(0);
  const [selectedEventCategory, setSelectedEventCategory] =
    useState<EventCategoryFilter>("All");
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  const filteredEvents = useMemo(
    () => getFilteredEvents(selectedEventCategory),
    [selectedEventCategory],
  );
  const visibleEvents = useMemo(
    () => getVisibleEvents(filteredEvents, eventWindowStart),
    [eventWindowStart, filteredEvents],
  );
  const selectedEvent = MOCK_EVENTS.find((event) => event.id === selectedEventId) || MOCK_EVENTS[0];
  const selectedAgents = selectedAgentIds
    .map((agentId) => agents.find((agent) => agent.id === agentId))
    .filter((agent): agent is NonNullable<typeof agent> => Boolean(agent));

  function handleRefreshEvents() {
    const nextStart =
      filteredEvents.length > 0
        ? (eventWindowStart + EVENT_WINDOW_SIZE) % filteredEvents.length
        : 0;
    const nextVisibleEvents = getVisibleEvents(filteredEvents, nextStart);

    setEventWindowStart(nextStart);
    setSelectedEventId(nextVisibleEvents[0]?.id ?? selectedEventId);
  }

  function handleSelectEventCategory(category: EventCategoryFilter) {
    const nextEvents = getFilteredEvents(category);

    setSelectedEventCategory(category);
    setEventWindowStart(0);
    setSelectedEventId(nextEvents[0]?.id ?? selectedEventId);
  }

  function handleSelectEvent(eventId: string) {
    const event = MOCK_EVENTS.find((candidate) => candidate.id === eventId);

    setSelectedEventId(eventId);

    if (event && selectedEventCategory !== "All" && event.category !== selectedEventCategory) {
      setSelectedEventCategory(event.category);
      setEventWindowStart(0);
    }
  }

  function handleSelectAgent(agentId: string) {
    setSelectedAgentIds((currentAgentIds) => {
      if (currentAgentIds.includes(agentId)) {
        return currentAgentIds.filter((currentAgentId) => currentAgentId !== agentId);
      }

      if (currentAgentIds.length < 2) {
        return [...currentAgentIds, agentId];
      }

      return [currentAgentIds[0], agentId];
    });
  }

  function handleEnterArena() {
    setErrorMessage(null);
    startCreateTransition(async () => {
      try {
        if (selectedAgents.length !== 2) {
          throw new Error("Choose two arena agents before starting the duel.");
        }

        const nextRound = await createRound({
          agentIds: selectedAgents.map((agent) => agent.id),
          eventId: selectedEvent.id,
        });
        writeStoredDemoRound(nextRound);
        router.push("/round");
      } catch {
        const demoRound = createDemoRoundState({
          agents: selectedAgents,
          event: selectedEvent,
        });

        writeStoredDemoRound(demoRound);
        router.push("/round?demo=1");
      }
    });
  }

  const acidWallpaperStyle = { backgroundColor: "#fcee09" };

  return (
    <main
      className="landing-black-text acid-yellow-section h-screen overflow-y-auto overflow-x-hidden snap-y snap-proximity scroll-smooth selection:bg-[#fcee09] selection:text-black"
      style={acidWallpaperStyle}
    >
      <LandingNav />
      
      {/* Section 01: Hero */}
      <section className="h-screen min-h-screen w-full snap-start snap-always shrink-0 overflow-hidden bg-black">
        <LandingHero />
      </section>

      <SectionTransition from="dark" to="yellow" label="// EVENT.MODULE loading..." />

      {/* Section 02: Event Selection */}
      <section
        className="acid-yellow-section relative min-h-screen w-full snap-start snap-always shrink-0 overflow-hidden"
        style={acidWallpaperStyle}
      >
        <div className="acid-yellow-gradient absolute inset-0" />
        <div className="acid-grid-overlay absolute inset-0 opacity-25" />
        <div className="relative z-10">
        <EventSelectionSection 
          activeCategory={selectedEventCategory}
          categoryOptions={EVENT_CATEGORY_FILTERS}
          events={MOCK_EVENTS}
          filteredEventCount={filteredEvents.length}
          selectedEventId={selectedEventId} 
          visibleEvents={visibleEvents}
          onRefreshEvents={handleRefreshEvents}
          onSelectCategory={handleSelectEventCategory}
          onSelectEvent={handleSelectEvent}
        />
        </div>
      </section>

      <SectionTransition from="yellow" to="yellow" label="// AGENT.SELECTOR online..." />

      {/* Section 03: Agent Selection */}
      <section
        className="acid-yellow-section relative min-h-screen w-full snap-start snap-always shrink-0 overflow-hidden"
        style={acidWallpaperStyle}
      >
        <div className="acid-yellow-gradient absolute inset-0" />
        <div className="acid-grid-overlay absolute inset-0 opacity-25" />
        <div className="relative z-10">
        <AgentSelectionSection 
          agents={agents}
          errorMessage={agentErrorMessage}
          isLoading={isLoadingAgents}
          onAgentCreated={refreshAgents}
          selectedAgentIds={selectedAgentIds}
          onSelectAgent={handleSelectAgent}
        />
        </div>
      </section>

      <SectionTransition from="yellow" to="yellow" label="// BATTLE.PREVIEW armed..." labelOnly />

      {/* Section 04: Battle Preview */}
      <section
        className="acid-yellow-section relative min-h-screen w-full snap-start snap-always shrink-0 overflow-hidden"
        style={acidWallpaperStyle}
      >
        <div className="acid-yellow-gradient absolute inset-0" />
        <div className="acid-grid-overlay absolute inset-0 opacity-25" />
        <div className="relative z-10">
        <BattlePreviewSection 
          errorMessage={agentErrorMessage}
          isLoadingAgents={isLoadingAgents}
          selectedEvent={selectedEvent}
          selectedAgents={selectedAgents}
          onEnterArena={handleEnterArena}
          isCreating={isCreating}
        />
        </div>
      </section>

      {/* Global Error Message Toast-like */}
      {errorMessage && (
        <div className="fixed bottom-10 right-10 z-50 border-[3px] border-black bg-[#fcee09] p-4 text-xs font-black uppercase tracking-widest text-black shadow-[8px_8px_0_#000] animate-in fade-in slide-in-from-bottom-5">
          {errorMessage}
        </div>
      )}
    </main>
  );
}
