type TopicMeterProps = {
  topic: string;
  averageConfidence: number;
  lowConfidenceCount: number;
  nonAcceptedCount: number;
  weaknessScore: number;
};

export function TopicMeter({
  topic,
  averageConfidence,
  lowConfidenceCount,
  nonAcceptedCount,
  weaknessScore,
}: TopicMeterProps) {
  const width = Math.min(100, Math.round((weaknessScore / 12) * 100));

  return (
    <div className="rounded-[1.5rem] border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-slate-950">{topic}</h3>
        <p className="text-sm font-medium text-slate-600">Weakness {weaknessScore.toFixed(1)}</p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-rose-500"
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Avg confidence {averageConfidence.toFixed(1)} • {lowConfidenceCount} low-confidence
        problems • {nonAcceptedCount} recent misses
      </p>
    </div>
  );
}
