"use client";

import { useEffect, useRef, useState } from "react";
import { AskResponse } from "@/lib/types";
import { ChatMessage, ExplanationPayload } from "./types";

const KIND_TONE: Record<string, string> = {
  Action: "text-coral",
  Agent: "text-sky",
  Person: "text-white",
  Doc: "text-mint",
  Plan: "text-ash",
};

function Avatar({ name }: { name: string }) {
  return (
    <div className="hidden h-8 w-8 shrink-0 items-center sm:flex justify-center rounded-full bg-ember text-[13px] font-semibold text-coral shadow-[var(--shadow-soft)]">
      {name.charAt(0)}
    </div>
  );
}

function Badge({ children, tone = "" }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className={`inline-flex max-w-full items-center break-all rounded-[6px] bg-graphite px-1.5 py-0.5 font-mono text-[11px] ${tone || "text-ash"}`}>
      {children}
    </span>
  );
}

/** Split Concierge text into readable parts: earlier-told line, body, cited sources and the source link. */
function parseAnswer(a: AskResponse) {
  let body = a.answer;
  if (a.earlier_told && body.startsWith(a.earlier_told.text)) body = body.slice(a.earlier_told.text.length).trim();
  let sources: string[] = [];
  const s = body.match(/\(sources?: ([^)]*)\)\s*$/);
  if (s) {
    body = body.slice(0, s.index).trim();
    if (!/^https?:/.test(s[1])) sources = s[1].split(/,\s*/);
  }
  body = body.replace(/^From the company graph:\s*/, "");
  const policy = body.match(/^(.*?): (.*?)\. Policy text: “([\s\S]*)”$/);
  const parts = policy ? [] : body.split(" | ");
  let llmText = a.answer;
  if (a.earlier_told && llmText.startsWith(a.earlier_told.text)) llmText = llmText.slice(a.earlier_told.text.length).trim();
  return { policy: policy ? { title: policy[1], value: policy[2], quote: policy[3] } : null, parts, sources, llmText };
}

function AnswerBody({ answer }: { answer: AskResponse }) {
  const p = parseAnswer(answer);
  return (
    <div className="space-y-3">
      {answer.llm_used && (
        <span
          title={answer.model ? `Written by ${answer.model} from graph tool results` : "Written by an LLM from graph tool results"}
          className="inline-flex items-center gap-1 rounded-[6px] bg-ember px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-coral"
        >
          ✦ AI
        </span>
      )}
      {answer.earlier_told && <EarlierTold answer={answer} />}
      {answer.llm_used ? (
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-white">{p.llmText}</p>
      ) : p.policy ? (
        <div className="space-y-2">
          <div className="text-[15px] leading-relaxed text-white">
            <span className="text-ash">{p.policy.title}: </span>
            <span className="font-medium">{p.policy.value}</span>
          </div>
          <blockquote className="border-l-2 border-line pl-3 text-[13px] leading-relaxed text-ash">{p.policy.quote}</blockquote>
        </div>
      ) : (
        <ul className="space-y-2">
          {p.parts.map((part, i) => {
            const [head, ...rest] = part.split(": ");
            const tail = rest.join(": ");
            return (
              <li key={i} className="text-[14px] leading-relaxed text-white">
                <span className="font-medium">{head}</span>
                {tail && <span className="text-ash">: {tail.split("; ").join(" · ")}</span>}
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {answer.versions.map((v) => (
          <Badge key={v} tone="text-mint">
            {v}
          </Badge>
        ))}
        {p.sources.map((s) => (
          <Badge key={s}>{s}</Badge>
        ))}
        {answer.source_url && (
          <a href={answer.source_url} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-smoke underline-offset-2 hover:text-white hover:underline">
            source ↗
          </a>
        )}
      </div>
      {answer.tool_trace && answer.tool_trace.length > 0 && <HowIFound steps={answer.tool_trace} />}
    </div>
  );
}

/** Collapsible "How I found this": the graph tools the agent called, their arguments and the Cypher they ran. */
function HowIFound({ steps }: { steps: NonNullable<AskResponse["tool_trace"]> }) {
  return (
    <details className="group rounded-[12px] bg-obsidian px-3 py-2">
      <summary className="flex min-h-[32px] cursor-pointer list-none items-center gap-2 text-[12px] text-ash hover:text-white">
        <span className="transition-transform group-open:rotate-90">›</span>
        How I found this · {steps.length} graph {steps.length === 1 ? "step" : "steps"}
      </summary>
      <ol className="mt-2 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="text-sky">{s.tool}</Badge>
              {Object.entries(s.args)
                .filter(([, v]) => v !== null && v !== "")
                .map(([k, v]) => (
                  <Badge key={k}>
                    {k}={typeof v === "string" ? v : JSON.stringify(v)}
                  </Badge>
                ))}
              {s.error && <Badge tone="text-coral">error</Badge>}
            </div>
            {s.cypher.map((c) => (
              <div key={c.name}>
                <div className="font-mono text-[10px] text-smoke">{c.name}.cypher</div>
                <pre className="mt-0.5 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-[8px] bg-graphite p-2 font-mono text-[11px] leading-snug text-ash">
                  {c.query}
                </pre>
              </div>
            ))}
          </li>
        ))}
      </ol>
    </details>
  );
}

function EarlierTold({ answer }: { answer: AskResponse }) {
  const e = answer.earlier_told!;
  return (
    <div className="rounded-[12px] bg-ember/60 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,99,99,0.25)]">
      <div className="eyebrow !text-coral">Correction · memory</div>
      <div className="mt-1 text-[14px] leading-relaxed text-white">{e.text}</div>
      <div className="mt-1 font-mono text-[11px] text-ash">
        told {new Date(e.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {e.version_id} → {answer.versions[0]}
      </div>
    </div>
  );
}

function Explanation({ data }: { data: ExplanationPayload }) {
  const { change, path, items } = data;
  return (
    <div className="space-y-4">
      <div className="text-[15px] leading-relaxed text-white">
        <span className="font-medium">{data.changeTitle}</span>
        <span className="text-ash"> affects {items.length} {items.length === 1 ? "thing" : "things"} in {data.department}.</span>
      </div>
      {change && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-[12px] bg-obsidian p-3">
            <div className="eyebrow">Before · {change.before.version_id}</div>
            <div className="mt-1.5 text-[13px] text-ash line-through decoration-smoke">{change.before.value}</div>
          </div>
          <div className="rounded-[12px] bg-obsidian p-3 shadow-[inset_0_0_0_1px_rgba(89,212,153,0.25)]">
            <div className="eyebrow !text-mint">Now · {change.after.version_id}</div>
            <div className="mt-1.5 text-[13px] text-white">{change.after.value}</div>
          </div>
        </div>
      )}
      {path && path.hops.length > 0 && (
        <div>
          <div className="eyebrow mb-2">Why it reaches {data.pathTarget?.label ?? "you"} · graph path</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {path.hops.map((h, i) => (
              <span key={`${h}-${i}`} className="flex items-center gap-1.5">
                <Badge tone="text-white">
                  <span className="break-all">{h}</span>
                </Badge>
                {i < path.via.length && <span className="font-mono text-[10px] text-smoke">─{path.via[i]}→</span>}
              </span>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="eyebrow mb-2">Affected in {data.department}</div>
        <ul className="divide-y divide-graphite overflow-hidden rounded-[12px] bg-obsidian">
          {items.slice(0, 6).map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 truncate text-[13px] text-white">{it.label}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                <Badge tone={KIND_TONE[it.kind]}>{it.kind}</Badge>
                {it.status && it.status !== "open" && <Badge tone={it.status === "blocked" ? "text-coral" : it.status === "resolved" ? "text-mint" : ""}>{it.status}</Badge>}
              </span>
            </li>
          ))}
          {items.length > 6 && <li className="px-3 py-2 font-mono text-[11px] text-smoke">+{items.length - 6} more</li>}
        </ul>
      </div>
      {data.answer && (
        <div className="border-t border-graphite pt-4">
          <div className="eyebrow mb-2">What to do now</div>
          <AnswerBody answer={data.answer} />
        </div>
      )}
    </div>
  );
}

export function Chat({
  company,
  asker,
  messages,
  busy,
  starters,
  onSend,
}: {
  company: string;
  asker: string;
  messages: ChatMessage[];
  busy: boolean;
  starters: string[];
  onSend: (q: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const submit = () => {
    const q = draft.trim();
    if (!q || busy) return;
    setDraft("");
    onSend(q);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-[720px] space-y-6">
          {messages.length === 0 && (
            <div className="rise pt-4 text-center sm:pt-10">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-ember text-xl font-semibold text-coral shadow-[var(--shadow-key)]">
                {company.charAt(0)}
              </div>
              <h1 className="text-[26px] font-normal sm:text-[32px] tracking-[0.004em] text-white">Ask {company} anything</h1>
              <p className="mx-auto mt-3 max-w-[460px] text-[15px] leading-relaxed text-ash">
                Policies, teams, people, docs and agents, answered from {company}&apos;s own company graph. When a fact changes, I tell you what changed and why it matters to you.
              </p>
              <div className="mx-auto mt-8 grid max-w-[560px] grid-cols-1 gap-2 sm:grid-cols-2 text-left">
                {starters.map((s) => (
                  <button key={s} onClick={() => onSend(s)} className="card-key group min-h-11 px-4 py-3 text-[13px] text-ash transition hover:text-white">
                    {s}
                    <span className="float-right text-smoke opacity-0 transition group-hover:opacity-100">↵</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="rise flex justify-end">
                <div className="max-w-[80%] rounded-[16px] rounded-br-[6px] bg-graphite px-4 py-2.5 text-[14px] text-white shadow-[var(--shadow-soft)]">
                  {m.context && <div className="eyebrow mb-1">{m.context}</div>}
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={m.id} className="rise flex gap-2 sm:gap-3">
                <Avatar name={company} />
                <div className="card-key min-w-0 flex-1 px-4 py-4 sm:px-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-[13px] font-medium text-white">{company} Assistant</span>
                    <span className="rounded-[6px] bg-ember px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-coral">AI</span>
                  </div>
                  {m.kind === "answer" && <AnswerBody answer={m.answer} />}
                  {m.kind === "explanation" && <Explanation data={m.data} />}
                  {m.kind === "text" && <p className={`text-[14px] leading-relaxed ${m.tone === "error" ? "text-coral" : "text-ash"}`}>{m.text}</p>}
                </div>
              </div>
            )
          )}
          {busy && (
            <div className="flex gap-3">
              <Avatar name={company} />
              <div className="card-key flex items-center gap-1 px-5 py-4">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="dot h-1.5 w-1.5 rounded-full bg-ash" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
                <span className="ml-2 font-mono text-[11px] text-smoke">walking the graph…</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
      <div className="sticky bottom-0 bg-canvas px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 sm:px-8 sm:pb-6">
        <div className="mx-auto max-w-[720px]">
          <div className="flex items-center gap-2 rounded-[12px] bg-obsidian p-1.5 pl-4 shadow-[var(--shadow-key)] focus-within:shadow-[rgba(255,255,255,0.05)_0_1px_0_inset,rgba(255,255,255,0.45)_0_0_0_1px]">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={`Ask ${company} anything…`}
              className="min-h-11 min-w-0 flex-1 bg-transparent text-[16px] sm:text-[15px] text-white placeholder:text-smoke focus:outline-none"
            />
            <button onClick={submit} disabled={busy || !draft.trim()} className="btn-primary min-h-11 px-4 lg:min-h-0 lg:px-3 lg:py-2">
              Ask ↵
            </button>
          </div>
          <div className="mt-2 hidden text-center font-mono text-[11px] text-smoke sm:block">
            asking as {asker} | answers come only from {company}&apos;s graph | every answer is remembered
          </div>
        </div>
      </div>
    </div>
  );
}
