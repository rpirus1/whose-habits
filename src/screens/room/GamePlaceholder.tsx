import type { Snapshot } from '@/game/protocol'

// Temporary views for question, reveal and final until step 5 builds the real round loop.
export function GamePlaceholder({ snapshot }: { snapshot: Snapshot }) {
  const { question, reveal, final, players } = snapshot
  return (
    <section className="bg-card flex flex-col gap-3 rounded-2xl p-5">
      {question && (
        <>
          <p className="text-muted-foreground text-sm">
            Round {question.index + 1} of {question.total}
          </p>
          <p className="text-xl font-semibold">{question.text}</p>
        </>
      )}
      {reveal && !question && (
        <p className="text-muted-foreground">Reveal of round {reveal.index + 1}</p>
      )}
      {final && (
        <ol className="flex flex-col gap-1">
          {final.ranking.map(({ id, rank }) => {
            const p = players.find((x) => x.id === id)
            return (
              <li key={id}>
                {rank}. {p?.name} — {p?.score}
              </li>
            )
          })}
        </ol>
      )}
      <p className="text-muted-foreground text-sm">The round screens arrive in the next step.</p>
    </section>
  )
}
