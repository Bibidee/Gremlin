import { Feed } from "@/components/Feed";

export const metadata = {
  title: "The Feed — Gremlin",
};

export default function FeedPage() {
  return (
    <main className="page page--feed">
      <div className="page__intro">
        <h1 className="display page__heading">The Chaos Feed</h1>
        <p className="page__subheading">Every plea, verdict, and roast the Gremlin has ever handed down.</p>
      </div>
      <Feed limit={50} title="All Pleas" />
    </main>
  );
}
