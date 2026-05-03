"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { LandingEvent, LandingEventCategory } from "@/lib/mocks/landing-demo-data";
import { EventCard } from "./EventCard";
import { Crosshair, List, RefreshCw, ShieldCheck, X } from "lucide-react";

type EventCategoryFilter = LandingEventCategory | "All";

interface EventSelectionSectionProps {
  activeCategory: EventCategoryFilter;
  categoryOptions: EventCategoryFilter[];
  events: LandingEvent[];
  filteredEventCount: number;
  selectedEventId: string | null;
  visibleEvents: LandingEvent[];
  onRefreshEvents: () => void;
  onSelectCategory: (category: EventCategoryFilter) => void;
  onSelectEvent: (id: string) => void;
}

export function EventSelectionSection({
  activeCategory,
  categoryOptions,
  events,
  filteredEventCount,
  selectedEventId,
  visibleEvents,
  onRefreshEvents,
  onSelectCategory,
  onSelectEvent,
}: EventSelectionSectionProps) {
  const [isEventListOpen, setIsEventListOpen] = useState(false);
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ||
    visibleEvents[0] ||
    events[0];

  return (
    <section id="events" className="acid-yellow-section relative min-h-screen overflow-hidden py-24 md:py-28">
      <div className="acid-yellow-gradient absolute inset-0" />
      <div className="acid-grid-overlay absolute inset-0 opacity-35" />
      <div className="industrial-yellow-slab absolute left-[-12%] top-12 h-32 w-[58%] -skew-x-12 border-y-[6px] border-black" />
      <div className="industrial-yellow-slab absolute bottom-0 right-[-10%] h-48 w-[56%] -skew-x-12 border-t-[6px] border-black" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-12rem)] max-w-[1560px] flex-col justify-center gap-10 px-5 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 34 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mx-auto max-w-5xl space-y-5 text-center"
        >
          <div
            className="acid-label inline-flex items-center gap-3 border-[3px] border-black px-5 py-2 text-[11px] font-black shadow-[8px_8px_0_rgba(0,0,0,0.72)]"
            style={{
              color: "#050505",
              fontFamily: "monospace",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              WebkitTextFillColor: "#050505",
            }}
          >
            <Crosshair className="h-4 w-4" />
            {"/// EVENT.MODULE"}
            <span>LOADING...</span>
          </div>
          <h2
            className="font-black italic text-black"
            style={{
              fontFamily: "Impact, Haettenschweiler, Arial Black, sans-serif",
              fontSize: "clamp(76px, 12vw, 168px)",
              letterSpacing: "0",
              lineHeight: 0.82,
              textTransform: "uppercase",
              WebkitTextFillColor: "#050505",
            }}
          >
            CHOOSE YOUR
            <br />
            BATTLE EVENT.
          </h2>
          <p
            className="mx-auto text-xl font-black uppercase leading-none text-black md:text-2xl"
            style={{ WebkitTextFillColor: "#050505" }}
          >
            PICK THE ARENA OBJECTIVE.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 42 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="industrial-black-panel border-[6px] border-black p-4 shadow-[18px_18px_0_rgba(0,0,0,0.38)] md:p-7"
          style={{ backgroundColor: "#050505", color: "#ffffff" }}
        >
          <div className="mb-6 flex flex-row flex-wrap items-start justify-between gap-4 border-b-[6px] border-[#fcee09] pb-6">
            <SelectedMatchPanel event={selectedEvent} />
            <div className="relative z-50 flex shrink-0 flex-col items-end gap-3">
              <div
                className="flex items-center gap-3 text-[10px] font-black text-[#fcee09]"
                style={{ fontFamily: "monospace", letterSpacing: "0.22em", textTransform: "uppercase" }}
              >
                <ShieldCheck className="h-4 w-4" />
                {events.length} EVENTS ONLINE
              </div>
              <div
                className="text-right text-[9px] font-black uppercase text-white/45"
                style={{ fontFamily: "monospace", letterSpacing: "0.18em" }}
              >
                {activeCategory === "All"
                  ? "All Categories"
                  : `${filteredEventCount} ${activeCategory} Events`}
              </div>
              <div className="relative flex flex-wrap items-center justify-end gap-2">
                <EventControlButton
                  icon={RefreshCw}
                  label="Refresh"
                  title="Refresh visible events"
                  onClick={onRefreshEvents}
                />
                <EventControlButton
                  icon={List}
                  label="All Events"
                  title="Open full event list"
                  onClick={() => setIsEventListOpen((isOpen) => !isOpen)}
                />
              </div>
              <CategoryFilterRow
                activeCategory={activeCategory}
                categories={categoryOptions}
                onSelectCategory={onSelectCategory}
              />
            </div>
          </div>

          {isEventListOpen ? (
            <AllEventsPanel
              events={events}
              selectedEventId={selectedEvent?.id ?? null}
              onClose={() => setIsEventListOpen(false)}
              onSelectEvent={(eventId) => {
                onSelectEvent(eventId);
                setIsEventListOpen(false);
              }}
            />
          ) : null}

          <div className="flex snap-x gap-6 overflow-x-auto pb-6">
            {visibleEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isSelected={selectedEventId === event.id}
                onSelect={onSelectEvent}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function SelectedMatchPanel({ event }: { event: LandingEvent }) {
  return (
    <div className="min-w-0 max-w-3xl">
      <div className="acid-label mb-3 inline-flex border-2 border-[#fcee09] px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em]">
        LOCKED EVENT
      </div>
      <h3
        className="max-w-full break-words font-black leading-none text-white"
        style={{
          fontFamily: "Impact, Haettenschweiler, Arial Black, sans-serif",
          fontSize: "clamp(38px, 4.5vw, 68px)",
          textTransform: "uppercase",
        }}
      >
        {event.shortQuestion}
      </h3>
      <div className="mt-4 flex flex-wrap gap-2">
        <MatchTag label="Type" value={event.category} />
        <MatchTag label="Source" value={event.sourceShort} />
        <MatchTag label="Consensus" value={event.consensus} />
        <MatchTag label="Risk" value={event.difficulty} />
        <MatchTag label="Status" value={event.status} />
      </div>
    </div>
  );
}

function CategoryFilterRow({
  activeCategory,
  categories,
  onSelectCategory,
}: {
  activeCategory: EventCategoryFilter;
  categories: EventCategoryFilter[];
  onSelectCategory: (category: EventCategoryFilter) => void;
}) {
  return (
    <div className="flex max-w-[460px] flex-wrap justify-end gap-1.5">
      {categories.map((category) => {
        const isActive = category === activeCategory;

        return (
          <button
            key={category}
            type="button"
            className={`border px-2.5 py-1 text-[8px] font-black uppercase transition-colors ${
              isActive
                ? "border-[#39ff14] bg-[#39ff14] text-black"
                : "border-[#2b2b2b] bg-[#111111] text-white/70 hover:border-[#fcee09] hover:text-[#fcee09]"
            }`}
            style={{ fontFamily: "monospace", letterSpacing: "0.14em" }}
            onClick={() => onSelectCategory(category)}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}

function EventControlButton({
  icon: Icon,
  label,
  title,
  onClick,
}: {
  icon: typeof RefreshCw;
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="industrial-clip-sm inline-flex items-center gap-2 border-2 border-[#fcee09] bg-[#fcee09] px-3 py-2 text-[10px] font-black uppercase text-black transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#39ff14]"
      style={{ fontFamily: "monospace", letterSpacing: "0.18em" }}
      title={title}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function AllEventsPanel({
  events,
  selectedEventId,
  onClose,
  onSelectEvent,
}: {
  events: LandingEvent[];
  selectedEventId: string | null;
  onClose: () => void;
  onSelectEvent: (id: string) => void;
}) {
  return (
    <div className="mb-6 border-[3px] border-[#fcee09] bg-[#050505] p-3 shadow-[10px_10px_0_rgba(252,238,9,0.22)]">
      <div className="mb-3 flex items-center justify-between border-b-2 border-[#fcee09] pb-3">
        <div
          className="text-[10px] font-black uppercase text-[#fcee09]"
          style={{ fontFamily: "monospace", letterSpacing: "0.22em" }}
        >
          Total Event List
        </div>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center border-2 border-[#fcee09] text-[#fcee09] hover:bg-[#fcee09] hover:text-black"
          title="Close event list"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div
        className="grid max-h-[260px] gap-2 overflow-y-auto pr-1"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
      >
        {events.map((event) => {
          const isSelected = event.id === selectedEventId;

          return (
            <button
              key={event.id}
              type="button"
              className={`w-full border-2 p-3 text-left transition-colors ${
                isSelected
                  ? "border-[#39ff14] bg-[#39ff14] text-black"
                  : "border-[#2b2b2b] bg-[#101010] text-white hover:border-[#fcee09]"
              }`}
              onClick={() => onSelectEvent(event.id)}
            >
              <div
                className="mb-1 text-[9px] font-black uppercase"
                style={{ fontFamily: "monospace", letterSpacing: "0.2em" }}
              >
                {event.category} / {event.sourceShort} / {event.difficulty} Risk
              </div>
              <div
                className="text-base font-black italic leading-none uppercase"
                style={{
                  fontFamily: "Impact, Haettenschweiler, Arial Black, sans-serif",
                  letterSpacing: "0",
                }}
              >
                {event.shortQuestion}
              </div>
              <div
                className={`mt-2 text-[9px] font-black uppercase ${
                  isSelected ? "text-black/70" : "text-white/45"
                }`}
                style={{ fontFamily: "monospace", letterSpacing: "0.16em" }}
              >
                {event.consensus} / {event.status}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchTag({ label, value }: { label: string; value: string }) {
  return (
    <div className="industrial-dark-steel border-2 border-[#2b2b2b] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">
      <span className="text-[#fcee09]">{label}:</span> {value}
    </div>
  );
}
