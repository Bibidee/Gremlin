import { HallOfFame } from "@/components/HallOfFame";

export const metadata = {
  title: "Hall of Fame | Gremlin",
};

export default function HallOfFamePage() {
  return (
    <main className="page page--hall-of-fame">
      <div className="page__intro">
        <h1 className="display page__heading">Hall of Fame</h1>
        <p className="page__subheading">The biggest blessings, heists, and curses the Gremlin has ever handed down.</p>
      </div>
      <HallOfFame />
    </main>
  );
}
