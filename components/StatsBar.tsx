import type { AnswerPrelude, Endpoint } from "@/lib/types";

const ENDPOINT_LABEL: Record<Endpoint, string> = {
  web: "Web Search",
  context: "LLM Context",
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex gap-1.5">
      <dt>{label}</dt>
      <dd className="font-medium text-gray-900 dark:text-neutral-100">{value}</dd>
    </div>
  );
}

export function StatsBar({ prelude }: { prelude: AnswerPrelude }) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-neutral-400">
      <Stat label="Endpoint" value={ENDPOINT_LABEL[prelude.endpoint]} />
      <Stat label="Sources" value={prelude.source_count} />
      <Stat label="Retrieval" value={`${prelude.retrieval_ms} ms`} />
    </dl>
  );
}
