// 这里在干嘛：
// 把落地页专用的视觉配置和数据库里的 agent 主数据分开。
// 为什么这么写：
// DB 应该负责永久身份、战绩和 brain；颜色、插画、archetype 是前端包装层。
// 最后返回什么：
// 按 identityKey 返回一份 landing 卡片可以直接使用的视觉配置。

export type LandingAgentVisual = {
  accent: string;
  archetype: string;
  codename: string;
  color: string;
  description: string;
  image: string;
  riskLabel: "AGGRESSIVE" | "CONSERVATIVE" | "BALANCED";
  strengths: string[];
};

type ExternalAgentVisualInput = {
  avatarSeed?: string | null;
  name?: string;
  riskProfile?: string;
  style?: string;
};

export const LANDING_AGENT_VISUALS: Record<string, LandingAgentVisual> = {
  "agent-contrarian": {
    accent: "#42f5c8",
    archetype: "SLY",
    codename: "CONTRARIAN",
    color: "#10b981",
    description: "Thinks different. Profits from crowd mistakes.",
    image: "/agents/contrarian-agent-card.png",
    riskLabel: "BALANCED",
    strengths: ["Strategic Counters", "Resilience", "Shield Logic"],
  },
  "agent-macro": {
    accent: "#fbbf24",
    archetype: "ORACLE",
    codename: "MACRO",
    color: "#f59e0b",
    description: "Tracks regime shifts and rides the dominant macro narrative.",
    image: "/agents/macro-agent-card.png",
    riskLabel: "AGGRESSIVE",
    strengths: ["Narrative Velocity", "Regime Detection", "Macro Cycles"],
  },
  "agent-momentum": {
    accent: "#ff8a1f",
    archetype: "AGGRO",
    codename: "MOMENTUM",
    color: "#ff4d4d",
    description: "Cuts through noise. Rides strength. Breaks first.",
    image: "/agents/momentum-agent-card.png",
    riskLabel: "AGGRESSIVE",
    strengths: ["Speed", "Kinetic Energy", "Trend Following"],
  },
  "agent-news": {
    accent: "#38bdf8",
    archetype: "SIGNAL",
    codename: "NEWSWIRE",
    color: "#2563eb",
    description:
      "Reads the live narrative. Spots catalysts before they become consensus.",
    image: "/agents/news-agent-card.png",
    riskLabel: "CONSERVATIVE",
    strengths: ["Catalyst Detection", "Source Discipline", "Fast Context"],
  },
  "agent-quant": {
    accent: "#d8b4fe",
    archetype: "PRECISION",
    codename: "QUANTUM",
    color: "#a855f7",
    description:
      "Microstructure obsessed. Sizes by conviction interval, never bankroll.",
    image: "/agents/quant-agent-card.png",
    riskLabel: "BALANCED",
    strengths: ["Mean Reversion", "Disciplined Sizing", "Microstructure"],
  },
};

const FALLBACK_VISUAL: LandingAgentVisual = {
  accent: "#a3a3a3",
  archetype: "GENERIC",
  codename: "AGENT",
  color: "#737373",
  description: "An emerging contender in the arena.",
  image: "",
  riskLabel: "BALANCED",
  strengths: ["Adaptive", "Emerging", "Untested"],
};

const EXTERNAL_AGENT_VISUALS: Record<string, Pick<LandingAgentVisual, "accent" | "color">> = {
  "external-cyan": {
    accent: "#00eaff",
    color: "#0891b2",
  },
  "external-gold": {
    accent: "#fbbf24",
    color: "#f59e0b",
  },
  "external-neon": {
    accent: "#39ff14",
    color: "#10b981",
  },
  "external-red": {
    accent: "#ff1f2d",
    color: "#dc2626",
  },
};

function getRiskLabel(riskProfile?: string): LandingAgentVisual["riskLabel"] {
  if (riskProfile === "high") {
    return "AGGRESSIVE";
  }

  if (riskProfile === "low") {
    return "CONSERVATIVE";
  }

  return "BALANCED";
}

function toCardCodename(name?: string) {
  if (!name) {
    return "AGENT";
  }

  return name
    .replace(/\s+agent$/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .join(" ")
    .toUpperCase();
}

function toArchetype(style?: string) {
  if (!style) {
    return "CUSTOM";
  }

  return style.split(/\s+/).slice(0, 2).join(" ").toUpperCase();
}

export function getLandingAgentVisual(
  identityKey: string,
  externalInput: ExternalAgentVisualInput = {},
): LandingAgentVisual {
  const visual = LANDING_AGENT_VISUALS[identityKey];

  if (visual) {
    return visual;
  }

  if (identityKey.startsWith("agent-external-")) {
    const palette =
      EXTERNAL_AGENT_VISUALS[externalInput.avatarSeed ?? ""] ??
      EXTERNAL_AGENT_VISUALS["external-neon"];

    return {
      accent: palette.accent,
      archetype: toArchetype(externalInput.style),
      codename: toCardCodename(externalInput.name),
      color: palette.color,
      description: externalInput.style ?? "A builder-owned arena agent.",
      image: "",
      riskLabel: getRiskLabel(externalInput.riskProfile),
      strengths: ["Builder Owned", "Webhook Runtime", "Public Identity"],
    };
  }

  return FALLBACK_VISUAL;
}
