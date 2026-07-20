import { Leaderboard } from "@/components/Leaderboard";

export const metadata = {
  title: "Leaderboard | Gremlin",
};

export default function LeaderboardPage() {
  return (
    <main className="page page--leaderboard">
      <div className="page__intro">
        <h1 className="display page__heading">Ranks of the Swamp</h1>
        <p className="page__subheading">Richest, greediest, and most-cursed Gremlins in the ledger.</p>
      </div>
      <Leaderboard />
    </main>
  );
}
