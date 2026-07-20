import { DuelArena } from "@/components/DuelArena";

export const metadata = {
  title: "Duel Mode | Gremlin",
};

export default function DuelPage() {
  return (
    <main className="page page--duel">
      <div className="page__intro">
        <h1 className="display page__heading">Duel Mode</h1>
        <p className="page__subheading">Challenge another pleader. The Gremlin picks a winner. Loser pays up.</p>
      </div>
      <DuelArena />
    </main>
  );
}
