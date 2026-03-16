"use client";

import { classColor } from "@/lib/wow-constants";

interface Character {
  id: string;
  name: string;
  class: string;
  spec: string | null;
  role: string;
  itemLevel: number | null;
}

interface Signup {
  id: string;
  status: string;
  character: Character;
}

// ─── Game data ──────────────────────────────────────────────────────────────

const BLOODLUST_CLASSES = new Set(["shaman", "hunter", "mage", "evoker"]);

const BREZ_CLASSES = new Set(["druid", "death knight", "warlock"]);

const RAID_BUFF_MAP: Record<string, string[]> = {
  "Power Word: Fortitude": ["priest"],
  "Battle Shout": ["warrior"],
  "Arcane Intellect": ["mage"],
  "Mark of the Wild": ["druid"],
  "Blessing of Kings": ["paladin"],
  "Mystic Touch": ["monk"],
  "Chaos Brand": ["demon hunter"],
  "Skyfury": ["shaman"],
  "Blessing of the Bronze": ["evoker"],
};

// Ideal 20-man Mythic targets (±1 for flex)
const IDEAL = { tanks: 2, healers: 5, dps: 13, total: 20 };

// ─── Analysis engine ─────────────────────────────────────────────────────────

interface Issue {
  severity: "critical" | "warning" | "info";
  text: string;
}

function analyseComposition(accepted: Signup[]): Issue[] {
  const issues: Issue[] = [];
  const n = accepted.length;
  if (n === 0) return issues;

  const tanks = accepted.filter((s) => s.character.role === "TANK").length;
  const healers = accepted.filter((s) => s.character.role === "HEALER").length;
  const dps = accepted.filter((s) => s.character.role === "DPS").length;
  const classes = accepted.map((s) => s.character.class.toLowerCase());

  // Role balance — scaled for group size
  const scale = n / IDEAL.total;
  const minTanks = Math.max(1, Math.floor(IDEAL.tanks * scale));
  const maxTanks = Math.ceil((IDEAL.tanks + 1) * scale);
  const minHealers = Math.max(1, Math.floor((IDEAL.healers - 1) * scale));
  const maxHealers = Math.ceil((IDEAL.healers + 1) * scale);

  if (tanks < minTanks) {
    issues.push({ severity: "critical", text: `Only ${tanks} tank${tanks !== 1 ? "s" : ""} confirmed — need at least ${minTanks}` });
  } else if (tanks > maxTanks) {
    issues.push({ severity: "warning", text: `${tanks} tanks is high for ${n} players — consider swapping one to DPS` });
  }

  if (healers < minHealers) {
    issues.push({ severity: "critical", text: `Only ${healers} healer${healers !== 1 ? "s" : ""} — need at least ${minHealers} for ${n} players` });
  } else if (healers > maxHealers) {
    issues.push({ severity: "warning", text: `${healers} healers may be too many for ${n} players` });
  }

  // Bloodlust coverage
  const lustCount = classes.filter((c) => BLOODLUST_CLASSES.has(c)).length;
  if (lustCount === 0) {
    issues.push({ severity: "critical", text: "No Bloodlust/Heroism/Time Warp/Fury of the Aspects" });
  } else if (lustCount === 1) {
    issues.push({ severity: "info", text: "Only 1 Bloodlust source — consider a backup" });
  }

  // Battle Rez coverage
  if (!classes.some((c) => BREZ_CLASSES.has(c))) {
    issues.push({ severity: "warning", text: "No Battle Rez (Druid / Death Knight / Warlock)" });
  }

  // Raid buff coverage
  for (const [buff, providers] of Object.entries(RAID_BUFF_MAP)) {
    if (!providers.some((c) => classes.includes(c))) {
      issues.push({ severity: "info", text: `Missing ${buff}` });
    }
  }

  // Augmentation Evoker note
  const augPresent = accepted.some(
    (s) =>
      s.character.class.toLowerCase() === "evoker" &&
      s.character.spec?.toLowerCase().includes("augmentation")
  );
  if (!augPresent && n >= 15) {
    issues.push({ severity: "info", text: "No Augmentation Evoker — significant DPS amplification missing for large group" });
  }

  // iLvl spread warning
  const ilvls = accepted.map((s) => s.character.itemLevel).filter(Boolean) as number[];
  if (ilvls.length >= 5) {
    const min = Math.min(...ilvls);
    const max = Math.max(...ilvls);
    if (max - min > 30) {
      issues.push({ severity: "warning", text: `Large iLvl spread: ${min}–${max} (${max - min} gap). Check readiness requirements.` });
    }
  }

  return issues;
}

function verdict(issues: Issue[]): { label: string; color: string } {
  const hasCritical = issues.some((i) => i.severity === "critical");
  const hasWarning = issues.some((i) => i.severity === "warning");
  if (hasCritical) return { label: "🚨 Critical gaps — address before raid", color: "var(--wow-error, #e53e3e)" };
  if (hasWarning) return { label: `⚠️ ${issues.filter((i) => i.severity === "warning").length} warning${issues.filter((i) => i.severity === "warning").length !== 1 ? "s" : ""} — review before raid`, color: "var(--wow-warning, #ff8000)" };
  if (issues.length === 0) return { label: "✅ Composition looks solid", color: "var(--wow-success, #1eff00)" };
  return { label: `ℹ️ ${issues.filter((i) => i.severity === "info").length} suggestion${issues.filter((i) => i.severity === "info").length !== 1 ? "s" : ""}`, color: "var(--wow-gold)" };
}

const SEVERITY_COLOR: Record<Issue["severity"], string> = {
  critical: "var(--wow-error, #e53e3e)",
  warning: "var(--wow-warning, #ff8000)",
  info: "var(--wow-text-muted)",
};

const SEVERITY_ICON: Record<Issue["severity"], string> = {
  critical: "🚨",
  warning: "⚠️",
  info: "ℹ️",
};

// ─── UI ───────────────────────────────────────────────────────────────────────

function RoleBar({
  count,
  total,
  label,
  color,
}: {
  count: number;
  total: number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-14 text-right" style={{ color: "var(--wow-text-faint)" }}>
        {label}
      </span>
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: "6px", background: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${total ? (count / total) * 100 : 0}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums" style={{ color, width: "2.5rem" }}>
        {count} / {total}
      </span>
    </div>
  );
}

export default function CompositionPanel({ signups }: { signups: Signup[] }) {
  const accepted = signups.filter((s) => s.status === "ACCEPTED");

  if (accepted.length === 0) {
    return (
      <p className="text-center py-12 text-sm" style={{ color: "var(--wow-text-faint)" }}>
        No confirmed sign-ups yet.
      </p>
    );
  }

  const tanks = accepted.filter((s) => s.character.role === "TANK").length;
  const healers = accepted.filter((s) => s.character.role === "HEALER").length;
  const dps = accepted.filter((s) => s.character.role === "DPS").length;
  const classes = accepted.map((s) => s.character.class.toLowerCase());

  const hasBloodlust = classes.some((c) => BLOODLUST_CLASSES.has(c));
  const hasBrez = classes.some((c) => BREZ_CLASSES.has(c));
  const missingBuffs = Object.entries(RAID_BUFF_MAP)
    .filter(([, providers]) => !providers.some((c) => classes.includes(c)))
    .map(([buff]) => buff);

  const issues = analyseComposition(accepted);
  const verd = verdict(issues);

  return (
    <div className="space-y-4">
      {/* Verdict banner */}
      <div
        className="rounded-lg px-4 py-3"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${verd.color}30`,
        }}
      >
        <p className="text-sm font-semibold" style={{ color: verd.color }}>
          {verd.label}
        </p>
        {issues.length > 0 && (
          <ul className="mt-2 space-y-1">
            {issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span>{SEVERITY_ICON[issue.severity]}</span>
                <span style={{ color: SEVERITY_COLOR[issue.severity] }}>{issue.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Role breakdown */}
      <div className="wow-panel" style={{ padding: "1.25rem" }}>
        <h3 className="wow-section-label mb-4" style={{ color: "var(--wow-gold)" }}>
          Role Breakdown ({accepted.length} confirmed)
        </h3>
        <div className="space-y-3">
          <RoleBar count={tanks} total={accepted.length} label="Tanks" color="#3FC7EB" />
          <RoleBar count={healers} total={accepted.length} label="Healers" color="#1eff00" />
          <RoleBar count={dps} total={accepted.length} label="DPS" color="#FF8C00" />
        </div>
      </div>

      {/* Utility coverage */}
      <div className="wow-panel" style={{ padding: "1.25rem" }}>
        <h3 className="wow-section-label mb-4" style={{ color: "var(--wow-gold)" }}>
          Utility Coverage
        </h3>
        <div className="flex flex-wrap gap-2">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={
              hasBloodlust
                ? { background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff6060" }
                : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--wow-text-faint)" }
            }
          >
            {hasBloodlust ? "✓" : "✗"} Bloodlust
          </span>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={
              hasBrez
                ? { background: "rgba(100,180,100,0.12)", border: "1px solid rgba(100,180,100,0.3)", color: "#60c060" }
                : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--wow-text-faint)" }
            }
          >
            {hasBrez ? "✓" : "✗"} Battle Rez
          </span>
          {missingBuffs.map((b) => (
            <span
              key={b}
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: "rgba(200,64,64,0.08)", border: "1px solid rgba(200,64,64,0.25)", color: "#c07070" }}
            >
              ✗ {b}
            </span>
          ))}
        </div>
      </div>

      {/* Player table */}
      <div className="wow-panel" style={{ overflow: "hidden" }}>
        <table className="wow-table w-full">
          <thead>
            <tr style={{ textAlign: "left", color: "var(--wow-text-faint)" }}>
              <th className="px-4 py-3">Character</th>
              <th className="px-4 py-3">Class / Spec</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-right">iLvl</th>
            </tr>
          </thead>
          <tbody>
            {accepted.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid rgba(200,169,106,0.07)" }}>
                <td className="px-4 py-2.5 font-medium" style={{ color: classColor(s.character.class) }}>
                  {s.character.name}
                </td>
                <td className="px-4 py-2.5" style={{ color: "var(--wow-text-muted)" }}>
                  {s.character.class}
                  {s.character.spec && (
                    <span style={{ color: "var(--wow-text-faint)" }}> · {s.character.spec}</span>
                  )}
                </td>
                <td className="px-4 py-2.5" style={{ color: "var(--wow-text-muted)" }}>
                  {s.character.role}
                </td>
                <td className="px-4 py-2.5 text-right" style={{ color: "var(--wow-text-muted)" }}>
                  {s.character.itemLevel ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
