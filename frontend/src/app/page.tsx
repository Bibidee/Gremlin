import Link from "next/link";
import { Feed } from "@/components/Feed";

export default function LandingPage() {
  return (
    <main className="page page--landing">
      <section className="hero">
        <div className="hero__mascot">👹</div>
        <h1 className="display hero__title">Talk the Gremlin into it.</h1>
        <p className="hero__pitch">
          A shared token ledger where the only way to move GREM is to convince a mischievous AI banker
          your plea deserves it. Bless, gift, steal, curse, or roast-tax — the Gremlin judges every case,
          live, on GenLayer.
        </p>
        <div className="hero__actions">
          <Link href="/arena" className="btn btn--primary btn--big">
            Enter the Arena
          </Link>
          <Link href="/feed" className="btn btn--big">
            Watch the Chaos
          </Link>
        </div>
      </section>

      <section className="rules">
        <p>
          ⚠ GREM is an internal toy balance for gameplay only. It is not a token, not tradable, not
          withdrawable, and has no financial value.
        </p>
      </section>

      <section className="how-it-works">
        <h2 className="display section-heading">How it works</h2>
        <div className="how-it-works__grid">
          <div className="how-card">
            <span className="how-card__num">01</span>
            <h3>Register</h3>
            <p>Connect a wallet, claim your starting 100 GREM.</p>
          </div>
          <div className="how-card">
            <span className="how-card__num">02</span>
            <h3>Plead your case</h3>
            <p>Pick an action — bless, gift, steal, curse, roast_tax — and write a plea in 280 characters.</p>
          </div>
          <div className="how-card">
            <span className="how-card__num">03</span>
            <h3>The Gremlin judges</h3>
            <p>An AI validator persona reads it and hands down grant, partial, or deny — with a roast.</p>
          </div>
          <div className="how-card">
            <span className="how-card__num">04</span>
            <h3>Balances shift, on-chain</h3>
            <p>Every verdict is capped and consensus-checked, then settled through GenLayer.</p>
          </div>
        </div>
      </section>

      <section className="landing-feed">
        <div className="landing-feed__header">
          <h2 className="display section-heading">Fresh from the swamp</h2>
          <Link href="/feed" className="btn">
            See all
          </Link>
        </div>
        <Feed limit={5} title="Latest Verdicts" />
      </section>
    </main>
  );
}
