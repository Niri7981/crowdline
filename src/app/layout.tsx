import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";

import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crowdline",
  description:
    "A World Cup meta-market game built on top of real Polymarket markets.",
};

export const viewport: Viewport = {
  colorScheme: "only light",
  initialScale: 1,
  width: "device-width",
};

const crowdlineRuntimeCss = `
  html, body { background: #05070d; color: #ffffff; }
  [class~="bg-[#05070d]"] { background-color: #05070d; }
  [class~="bg-[#0d1219]"] { background-color: #0d1219; }
  [class~="bg-[#0f1319]"] { background-color: #0f1319; }
  [class~="bg-[#10151c]"] { background-color: #10151c; }
  [class~="bg-[#11161d]"] { background-color: #11161d; }
  [class~="bg-[#0b0f14]"] { background-color: #0b0f14; }
  [class~="bg-[#121923]"] { background-color: #121923; }
  [class~="bg-[#151b23]"] { background-color: #151b23; }
  [class~="bg-[#0b0f12]"] { background-color: #0b0f12; }
  [class~="bg-[#0b2237]"] { background-color: #0b2237; }
  [class~="bg-[#123f28]"] { background-color: #123f28; }
  [class~="bg-[#151b20]"] { background-color: #151b20; }
  [class~="bg-[#171d12]"] { background-color: #171d12; }
  [class~="bg-[#1a2229]"] { background-color: #1a2229; }
  [class~="bg-[#3d171d]"] { background-color: #3d171d; }
  [class~="bg-[#0a76d6]"] { background-color: #0a76d6; }
  [class~="bg-[#1b71ff]"] { background-color: #1b71ff; }
  [class~="bg-[#1b71ff]/10"] { background-color: rgba(27, 113, 255, 0.1); }
  [class~="bg-[#1a7f46]"] { background-color: #1a7f46; }
  [class~="bg-[#1a7f46]/15"] { background-color: rgba(26, 127, 70, 0.15); }
  [class~="bg-[#232b36]"] { background-color: #232b36; }
  [class~="bg-[#6d2c33]/20"] { background-color: rgba(109, 44, 51, 0.2); }
  [class~="bg-[#7a2f39]"] { background-color: #7a2f39; }
  [class~="text-white"] { color: #ffffff; }
  [class~="text-white/75"] { color: rgba(255, 255, 255, 0.75); }
  [class~="text-[#8fa0b8]"] { color: #8fa0b8; }
  [class~="text-[#8ab7ff]"] { color: #8ab7ff; }
  [class~="text-[#7db0ff]"] { color: #7db0ff; }
  [class~="text-[#2f9bff]"] { color: #2f9bff; }
  [class~="text-[#667284]"] { color: #667284; }
  [class~="text-[#778393]"] { color: #778393; }
  [class~="text-[#8793a3]"] { color: #8793a3; }
  [class~="text-[#8a96a6]"] { color: #8a96a6; }
  [class~="text-[#9aa6b5]"] { color: #9aa6b5; }
  [class~="text-[#d6a900]"] { color: #d6a900; }
  [class~="text-[#20d47a]"] { color: #20d47a; }
  [class~="text-[#1ed17a]"] { color: #1ed17a; }
  [class~="text-[#ff5367]"] { color: #ff5367; }
  [class~="text-[#49d487]"] { color: #49d487; }
  [class~="text-[#ff7c87]"] { color: #ff7c87; }
  [class~="text-[#f8b84e]"] { color: #f8b84e; }
  [class~="text-[#31d67b]"] { color: #31d67b; }
  [class~="border-white/10"] { border-color: rgba(255, 255, 255, 0.1); }
  [class~="border-white/15"] { border-color: rgba(255, 255, 255, 0.15); }
  [class~="border-[#1b71ff]/25"] { border-color: rgba(27, 113, 255, 0.25); }
  [class~="border-[#1b71ff]/30"] { border-color: rgba(27, 113, 255, 0.3); }
  [class~="border-[#1b71ff]/50"] { border-color: rgba(27, 113, 255, 0.5); }
  .flex { display: flex; }
  .inline-flex { display: inline-flex; }
  .grid { display: grid; }
  .block { display: block; }
  .hidden { display: none; }
  .min-w-0 { min-width: 0; }
  .shrink-0 { flex-shrink: 0; }
  .flex-1 { flex: 1 1 0%; }
  .flex-col { flex-direction: column; }
  .flex-wrap { flex-wrap: wrap; }
  .items-center { align-items: center; }
  .items-start { align-items: flex-start; }
  .items-end { align-items: flex-end; }
  .justify-between { justify-content: space-between; }
  .justify-center { justify-content: center; }
  .justify-end { justify-content: flex-end; }
  .gap-1 { gap: 4px; }
  .gap-2 { gap: 8px; }
  .gap-3 { gap: 12px; }
  .gap-4 { gap: 16px; }
  .gap-12 { gap: 48px; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .mt-1 { margin-top: 4px; }
  .mt-2 { margin-top: 8px; }
  .mt-3 { margin-top: 12px; }
  .mt-4 { margin-top: 16px; }
  .mt-5 { margin-top: 20px; }
  .border-t { border-top-width: 1px; }
  .border-b { border-bottom-width: 1px; }
  .overflow-hidden { overflow: hidden; }
  .overflow-auto { overflow: auto; }
  .w-full { width: 100%; }
  .max-w-full { max-width: 100%; }
  .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .text-left { text-align: left; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .normal-case { text-transform: none; }
  .tracking-normal { letter-spacing: 0; }
  .transition { transition: all 160ms ease; }
  .rounded-full { border-radius: 999px; }
  .rounded-lg { border-radius: 9px; }
  .rounded-xl { border-radius: 12px; }
  .p-2 { padding: 8px; }
  .p-3 { padding: 12px; }
  .p-4 { padding: 16px; }
  .px-2 { padding-left: 8px; padding-right: 8px; }
  .px-2\\.5 { padding-left: 10px; padding-right: 10px; }
  .px-3 { padding-left: 12px; padding-right: 12px; }
  .px-4 { padding-left: 16px; padding-right: 16px; }
  .px-5 { padding-left: 20px; padding-right: 20px; }
  .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
  .py-1 { padding-top: 4px; padding-bottom: 4px; }
  .py-2 { padding-top: 8px; padding-bottom: 8px; }
  .py-3 { padding-top: 12px; padding-bottom: 12px; }
  .py-4 { padding-top: 16px; padding-bottom: 16px; }
  .pt-3 { padding-top: 12px; }
  .text-xs { font-size: 12px; line-height: 16px; }
  .text-sm { font-size: 14px; line-height: 20px; }
  .text-base { font-size: 16px; line-height: 24px; }
  .text-lg { font-size: 18px; line-height: 28px; }
  .text-xl { font-size: 20px; line-height: 28px; }
  .text-2xl { font-size: 24px; line-height: 32px; }
  .text-3xl { font-size: 30px; line-height: 36px; }
  .text-4xl { font-size: 36px; line-height: 40px; }
  .font-semibold { font-weight: 600; }
  .font-bold { font-weight: 700; }
  .leading-tight { line-height: 1.25; }
  .leading-snug { line-height: 1.375; }
  .leading-6 { line-height: 24px; }
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .max-w-2xl { max-width: 42rem; }
  .max-w-3xl { max-width: 48rem; }
  .h-3\\.5 { height: 14px; }
  .w-3\\.5 { width: 14px; }
  .h-4 { height: 16px; }
  .w-4 { width: 16px; }
  .h-5 { height: 20px; }
  .w-5 { width: 20px; }
  .h-6 { height: 24px; }
  .w-6 { width: 24px; }
  .h-8 { height: 32px; }
  .w-8 { width: 32px; }
  .h-10 { height: 40px; }
  .w-10 { width: 40px; }
  .h-14 { height: 56px; }
  .w-14 { width: 56px; }
  .opacity-80 { opacity: 0.8; }
  .disabled\\:cursor-not-allowed:disabled { cursor: not-allowed; }
  .pm-page {
    min-height: 100vh;
    overflow-x: hidden;
    background: radial-gradient(circle at 20% 0%, rgba(30,105,190,0.08), transparent 32%), #080c0f;
    color: #f5f7fb;
  }
  .pm-container {
    width: min(100%, 1360px);
    margin: 0 auto;
    padding: 16px;
  }
  .pm-topbar {
    position: sticky;
    top: 0;
    z-index: 40;
    box-sizing: border-box;
    max-width: 100vw;
    display: grid;
    grid-template-columns: auto minmax(220px, 600px) auto;
    align-items: center;
    gap: 18px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(8,12,15,0.92);
    padding: 14px max(16px, calc((100vw - 1360px) / 2 + 16px));
    backdrop-filter: blur(18px);
  }
  .pm-brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: #f6f8fb;
    font-size: 21px;
    font-weight: 750;
    text-decoration: none;
  }
  .pm-brandMark {
    display: inline-flex;
    width: 30px;
    height: 30px;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255,255,255,0.34);
    border-radius: 8px;
    color: #97a1af;
  }
  .pm-search {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 10px;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    background: #10161a;
    color: #687584;
    padding: 11px 14px;
    font-size: 14px;
  }
  .pm-topActions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }
  .pm-link {
    color: #8e99a8;
    font-size: 14px;
    font-weight: 650;
    text-decoration: none;
    transition: color 160ms ease;
  }
  .pm-link:hover { color: #f7f9fb; }
  .pm-primaryButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 9px;
    background: #0a76d6;
    color: #ffffff;
    padding: 10px 14px;
    font-size: 14px;
    font-weight: 750;
    text-decoration: none;
    white-space: nowrap;
  }
  .pm-primaryButton:hover { background: #0c86f5; }
  .pm-walletBadge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 9px;
    background: #10161a;
    color: #d7e2ef;
    padding: 9px 12px;
    font-size: 13px;
    font-weight: 750;
    white-space: nowrap;
  }
  .pm-walletConnect {
    position: relative;
    display: inline-flex;
  }
  .pm-walletButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid rgba(21,135,255,0.35);
    border-radius: 9px;
    background: linear-gradient(180deg, #1479de, #0864bd);
    color: #ffffff;
    cursor: pointer;
    padding: 10px 13px;
    font: inherit;
    font-size: 14px;
    font-weight: 800;
    line-height: 1;
    white-space: nowrap;
    box-shadow: 0 10px 26px rgba(10,118,214,0.18);
    transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
  }
  .pm-walletButton:hover {
    border-color: rgba(111,186,255,0.7);
    background: linear-gradient(180deg, #1a8fff, #0a76d6);
    transform: translateY(-1px);
  }
  .pm-walletButton[data-connected="true"] {
    border-color: rgba(43,216,126,0.28);
    background: #10161a;
    color: #e8f2fb;
    box-shadow: none;
  }
  .pm-walletStatusDot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: #6b7480;
    box-shadow: 0 0 0 3px rgba(107,116,128,0.14);
  }
  .pm-walletButton[data-connected="true"] .pm-walletStatusDot {
    background: #31d67b;
    box-shadow: 0 0 0 3px rgba(49,214,123,0.16);
  }
  .pm-walletMenu {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    z-index: 60;
    display: grid;
    width: 286px;
    gap: 10px;
    border: 1px solid rgba(255,255,255,0.11);
    border-radius: 12px;
    background: #0d1217;
    padding: 12px;
    color: #f5f7fb;
    box-shadow: 0 22px 70px rgba(0,0,0,0.42);
  }
  .pm-walletMenuLabel {
    color: #718094;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .pm-walletMenuAddress {
    margin-top: 5px;
    overflow-wrap: anywhere;
    color: #d8e3ef;
    font-family: var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    line-height: 1.45;
  }
  .pm-walletMenuMeta {
    margin-top: 5px;
    color: #8795a7;
    font-size: 12px;
    line-height: 1.45;
  }
  .pm-walletMenuBalance {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    background: rgba(255,255,255,0.04);
    padding: 10px;
    color: #8795a7;
    font-size: 12px;
    font-weight: 750;
  }
  .pm-walletMenuBalance strong {
    color: #ffffff;
    font-size: 13px;
  }
  .pm-walletProviderButton {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    background: #131a21;
    color: #f1f6fb;
    cursor: pointer;
    padding: 10px;
    text-align: left;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
  }
  .pm-walletProviderButton:hover {
    border-color: rgba(21,135,255,0.45);
    background: #17212b;
  }
  .pm-walletProviderButton:disabled,
  .pm-walletMenuAction:disabled {
    cursor: not-allowed;
    opacity: 0.62;
  }
  .pm-walletProviderButton small {
    display: block;
    margin-top: 2px;
    color: #7f8b9a;
    font-size: 11px;
    font-weight: 700;
  }
  .pm-walletProviderIcon {
    display: inline-flex;
    width: 34px;
    height: 34px;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #0a76d6;
    color: #ffffff;
    font-size: 13px;
    font-weight: 900;
  }
  .pm-walletMenuAction {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 9px;
    background: #141b22;
    color: #e5edf7;
    cursor: pointer;
    padding: 10px 12px;
    font: inherit;
    font-size: 13px;
    font-weight: 780;
  }
  .pm-walletMenuAction:hover { background: #19222b; }
  .pm-walletMenuActionDanger { color: #ff7c87; }
  .pm-walletMenuError {
    border: 1px solid rgba(255,83,103,0.26);
    border-radius: 9px;
    background: rgba(255,83,103,0.08);
    color: #ff9aa4;
    padding: 9px 10px;
    font-size: 12px;
    line-height: 1.45;
  }
  .pm-categoryNav {
    display: flex;
    width: min(100%, 1360px);
    margin: 0 auto;
    gap: 8px;
    overflow-x: auto;
    padding: 14px 16px 12px;
    scrollbar-width: none;
  }
  .pm-categoryNav::-webkit-scrollbar { display: none; }
  .pm-categoryPill {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 7px;
    border-radius: 999px;
    color: #798595;
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
  }
  .pm-categoryPill[data-active="true"] {
    background: rgba(0,112,244,0.14);
    color: #1587ff;
  }
  .pm-homeGrid {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr) 320px;
    gap: 16px;
    align-items: start;
  }
  .pm-detailGrid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 18px;
    align-items: start;
  }
  .pm-card {
    box-sizing: border-box;
    min-width: 0;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    background: #101417;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
  }
  .pm-cardPad { padding: 16px; }
  .pm-rail {
    position: sticky;
    top: 118px;
    display: grid;
    gap: 12px;
  }
  .pm-sectionTitle {
    color: #f5f7fb;
    font-size: 20px;
    font-weight: 750;
  }
  .pm-muted { color: #7e8b9b; }
  .pm-eyebrow {
    color: #738090;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .pm-feed {
    display: grid;
    gap: 12px;
  }
  .pm-feedHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 2px;
  }
  .pm-marketCard {
    box-sizing: border-box;
    min-width: 0;
    display: grid;
    gap: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    background: #101417;
    padding: 14px;
    color: #f4f7fb;
    transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
  }
  .pm-marketCard:hover {
    border-color: rgba(63,147,255,0.42);
    background: #12191e;
    transform: translateY(-1px);
  }
  .pm-marketCardTop {
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr) auto;
    align-items: start;
    gap: 12px;
  }
  .pm-positionRow {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 120px 120px 120px;
    gap: 12px;
  }
  .pm-marketIcon {
    display: flex;
    width: 46px;
    height: 46px;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.2), transparent 36%), linear-gradient(135deg, #173050, #0f5fc8 48%, #0b1a24);
    color: #ffffff;
  }
  .pm-marketTitle {
    color: #f7f9fb;
    font-size: 16px;
    font-weight: 760;
    line-height: 1.28;
    text-decoration: none;
  }
  .pm-marketQuestion {
    margin-top: 5px;
    color: #7d8897;
    font-size: 13px;
    line-height: 1.45;
  }
  .pm-price {
    color: #f8fafc;
    font-size: 18px;
    font-weight: 780;
  }
  .pm-outcomeList {
    display: grid;
    gap: 8px;
  }
  .pm-outcomeRow {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    color: #c5ccd6;
    font-size: 13px;
  }
  .pm-progressTrack {
    height: 5px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255,255,255,0.07);
  }
  .pm-progressFill {
    height: 100%;
    border-radius: inherit;
    background: #0a76d6;
  }
  .pm-actionGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .pm-buyUp,
  .pm-buyDown {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 800;
    text-decoration: none;
  }
  .pm-buyUp { background: rgba(24,165,92,0.16); color: #1ed17a; }
  .pm-buyDown { background: rgba(230,54,72,0.14); color: #ff5367; }
  .pm-statGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
  }
  .pm-stat {
    border-top: 1px solid rgba(255,255,255,0.08);
    padding-top: 10px;
  }
  .pm-statValue {
    margin-top: 3px;
    color: #f7f9fb;
    font-size: 15px;
    font-weight: 760;
  }
  .pm-detailHeader {
    box-sizing: border-box;
    min-width: 0;
    display: grid;
    gap: 16px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px;
    background: #101417;
    padding: 18px;
  }
  .pm-stickyPanel {
    position: sticky;
    top: 118px;
  }
  .pm-detailHeader h1,
  .pm-marketTitle,
  .pm-sectionTitle {
    overflow-wrap: anywhere;
  }
  @media (min-width: 640px) {
    .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .sm\\:text-3xl { font-size: 30px; line-height: 36px; }
    .sm\\:text-4xl { font-size: 36px; line-height: 40px; }
    .sm\\:grid-cols-\\[56px_minmax\\(0\\,1fr\\)\\] { grid-template-columns: 56px minmax(0, 1fr); }
    .sm\\:inline { display: inline; }
  }
  @media (max-width: 1180px) {
    .pm-homeGrid { grid-template-columns: minmax(0, 1fr) 310px; }
    .pm-leftRail { display: none; }
  }
  @media (max-width: 900px) {
    .pm-topbar { grid-template-columns: 1fr auto; }
    .pm-search { grid-column: 1 / -1; order: 3; }
    .pm-homeGrid,
    .pm-detailGrid { grid-template-columns: minmax(0, 1fr); }
    .pm-rail,
    .pm-stickyPanel { position: static; }
  }
  @media (max-width: 560px) {
    .pm-container { padding: 12px; }
    .pm-topbar { gap: 12px; padding: 12px; }
    .pm-brand { font-size: 18px; }
    .pm-link { display: none; }
    .pm-primaryButton {
      width: 42px;
      min-width: 42px;
      overflow: hidden;
      padding: 9px;
      font-size: 0;
    }
    .pm-primaryButton svg {
      width: 18px;
      height: 18px;
    }
    .pm-walletBadge {
      width: 42px;
      min-width: 42px;
      overflow: hidden;
      padding: 9px;
      font-size: 0;
    }
    .pm-walletBadge svg {
      width: 18px;
      height: 18px;
    }
    .pm-walletButton {
      width: 42px;
      min-width: 42px;
      overflow: hidden;
      padding: 9px;
      font-size: 0;
    }
    .pm-walletButton svg,
    .pm-walletStatusDot {
      flex: 0 0 auto;
    }
    .pm-walletButtonText,
    .pm-walletButton svg:last-child {
      display: none;
    }
    .pm-walletMenu {
      right: -8px;
      width: min(286px, calc(100vw - 24px));
    }
    .pm-marketCardTop { grid-template-columns: 42px minmax(0, 1fr); }
    .pm-marketCardTop > :last-child { grid-column: 2; justify-self: start; }
  }
  @media (max-width: 640px) {
    .pm-positionRow {
      grid-template-columns: 1fr;
    }
  }
  [class~="bg-[radial-gradient(circle_at_top_left,_rgba(27,113,255,0.22),_transparent_40%),#0d1219]"] {
    background: radial-gradient(circle at top left, rgba(27,113,255,0.22), transparent 40%), #0d1219;
  }
  [class~="bg-[radial-gradient(circle_at_top_left,_rgba(27,113,255,0.24),_transparent_42%),#0d1219]"] {
    background: radial-gradient(circle at top left, rgba(27,113,255,0.24), transparent 42%), #0d1219;
  }
  .crowdline-home-hero-layout,
  .crowdline-detail-layout {
    display: grid;
    gap: 24px;
    grid-template-columns: minmax(0, 1fr);
  }
  .crowdline-market-row {
    display: grid;
    gap: 20px;
  }
  @media (min-width: 768px) {
    .crowdline-market-row {
      align-items: center;
      grid-template-columns: minmax(0, 1.4fr) repeat(4, minmax(0, 0.8fr)) auto;
    }
  }
  @media (min-width: 1024px) {
    .crowdline-home-hero-layout {
      grid-template-columns: minmax(0, 1.2fr) 420px;
    }
    .crowdline-detail-layout {
      align-items: start;
      grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
    }
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: "only light" }}
    >
      <body className="min-h-full bg-[#05070d] text-white">
        <style dangerouslySetInnerHTML={{ __html: crowdlineRuntimeCss }} />
        {children}
      </body>
    </html>
  );
}
