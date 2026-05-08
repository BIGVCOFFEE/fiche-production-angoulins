export default function ModeEmploiPage() {
  return (
    <div style={{ maxWidth: "820px", margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>
          📖 Mode d'emploi
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-dim)", margin: 0 }}>
          Fonctionnement des onglets <strong>Saisie du soir</strong> et <strong>Production</strong> — du plus simple au plus complet.
        </p>
      </div>

      {/* VUE D'ENSEMBLE */}
      <Section emoji="🔄" title="Vue d'ensemble — le cycle quotidien">
        <p style={pStyle}>
          L'application fonctionne sur un cycle en deux temps qui se répète chaque jour :
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "12px 0" }}>
          <Card accent="var(--accent)">
            <div style={{ fontSize: "20px", marginBottom: "6px" }}>🌙</div>
            <strong style={{ fontSize: "13px", color: "var(--text)" }}>Le soir</strong>
            <p style={{ ...pStyle, marginTop: "4px" }}>
              On compte ce qui reste invendu et on le saisit dans <em>Saisie du soir</em>.
            </p>
          </Card>
          <Card accent="var(--accent)">
            <div style={{ fontSize: "20px", marginBottom: "6px" }}>☀️</div>
            <strong style={{ fontSize: "13px", color: "var(--text)" }}>Le matin</strong>
            <p style={{ ...pStyle, marginTop: "4px" }}>
              La page <em>Production</em> calcule automatiquement ce qu'il faut produire grâce aux restants saisis la veille.
            </p>
          </Card>
        </div>
        <Callout type="info">
          Sans saisie du soir, la production du lendemain ne peut pas calculer les stocks — elle affichera la cible pleine comme s'il ne restait rien.
        </Callout>
      </Section>

      {/* SAISIE DU SOIR */}
      <Section emoji="🌙" title="Saisie du soir">

        <Level n={1} label="Saisir les restants">
          <p style={pStyle}>
            Après la fermeture, allez sur <strong>Saisie du soir</strong>.
          </p>
          <p style={pStyle}>
            Pour chaque produit, entrez le nombre d'unités <strong>non vendues</strong> restantes.
          </p>
          <ExampleBox>
            Il reste 4 croissants → saisir <Num>4</Num> dans la ligne Croissant.<br />
            Il ne reste rien → saisir <Num>0</Num> (ne pas laisser vide, ça signifie « pas encore saisi »).
          </ExampleBox>
          <p style={pStyle}>
            La colonne <strong>Cible</strong> rappelle l'objectif de vente du jour pour référence.
          </p>
        </Level>

        <Level n={2} label="Clôturer la journée">
          <p style={pStyle}>
            Une fois toutes les quantités saisies, cliquez sur <strong>Clôturer la journée</strong> en bas de page.
          </p>
          <p style={pStyle}>
            La clôture verrouille la saisie (plus de modification possible) et signale à la production du lendemain que les données sont fiables.
          </p>
          <Callout type="warn">
            Si la clôture n'est pas faite, un avertissement <em>« Saisie non clôturée »</em> apparaît le lendemain matin sur la fiche production.
          </Callout>
        </Level>

        <Level n={3} label="La colonne « À jeter »">
          <p style={pStyle}>
            À droite de chaque ligne s'affiche le nombre d'unités <strong>périmées ce soir</strong>, à jeter avant de fermer.
          </p>
          <p style={pStyle}>
            Le calcul dépend de la <strong>durée de vie</strong> du produit :
          </p>
          <ul style={ulStyle}>
            <li><strong>24 h</strong> (ex : baguette) → on jette ce qui restait <em>hier soir</em></li>
            <li><strong>48 h</strong> (ex : pain de campagne) → on jette ce qui restait <em>avant-hier soir</em></li>
            <li><strong>72 h</strong> (ex : certaines viennoiseries) → on jette ce qui restait il y a <em>3 jours</em></li>
          </ul>
          <ExampleBox>
            On est mercredi soir. Il restait 3 baguettes (24 h) mardi soir → <strong>À jeter : 3</strong>.<br />
            Il restait 5 pains de campagne (48 h) lundi soir → <strong>À jeter : 5</strong>.
          </ExampleBox>
        </Level>

        <Level n={4} label="Prolonger un produit (conserveExtra)">
          <p style={pStyle}>
            Parfois, un produit techniquement périmé est encore présentable et vous souhaitez le garder un jour de plus. Utilisez le champ <strong>Prolongé</strong> (colonne ⚡).
          </p>
          <ExampleBox>
            Vendredi soir : 6 tartelettes doivent être jetées, mais elles sont parfaites pour le samedi.
            Saisir <Num>6</Num> dans la colonne ⚡ de la ligne Tartelette.<br /><br />
            Le lendemain matin (samedi), la fiche production affiche <em>⚡ +6 prolongé</em> sur ce produit.
            Ces 6 unités sont déjà comptées dans le stock — pas besoin d'en produire davantage.
          </ExampleBox>
          <Callout type="warn">
            Le samedi soir, ces unités réapparaissent automatiquement dans « À jeter » — elles doivent être retirées ce soir sans exception.
          </Callout>
        </Level>

      </Section>

      {/* PRODUCTION */}
      <Section emoji="☀️" title="Production">

        <Level n={1} label="Lire la fiche production">
          <p style={pStyle}>
            La colonne <strong>À produire</strong> indique combien d'unités fabriquer pour la journée. C'est la seule colonne qui compte pour les boulangers.
          </p>
          <ExampleBox>
            Croissant — stock veille : 3 · cible : 15 → À produire : <Num>12</Num>
          </ExampleBox>
        </Level>

        <Level n={2} label="Comment le stock est calculé">
          <p style={pStyle}>
            Le <strong>stock</strong> de chaque produit est la somme des quantités restantes saisies au cours des derniers jours, selon la durée de vie :
          </p>
          <ul style={ulStyle}>
            <li><strong>24 h</strong> → stock = restants d'hier soir uniquement</li>
            <li><strong>48 h</strong> → stock = restants d'hier + avant-hier</li>
            <li><strong>72 h</strong> → stock = restants des 3 dernières nuits</li>
          </ul>
          <p style={pStyle}>
            La formule de base est : <code style={codeStyle}>À produire = max(0, Cible − Stock)</code>
          </p>
        </Level>

        <Level n={3} label="La cible — semaine, samedi, dimanche">
          <p style={pStyle}>
            Chaque produit a une cible différente selon le type de jour : <strong>Semaine</strong> (lun–ven), <strong>Samedi</strong> et <strong>Dimanche</strong>.
          </p>
          <ExampleBox>
            Baguette tradition → cible semaine : <Num>15</Num> · cible samedi : <Num>25</Num><br />
            Un lundi avec 4 restants → À produire : 15 − 4 = <Num>11</Num><br />
            Un samedi avec 4 restants → À produire : 25 − 4 = <Num>21</Num>
          </ExampleBox>
          <p style={pStyle}>
            Les cibles se règlent dans l'onglet <strong>Admin → Produits</strong> (réservé aux administrateurs).
          </p>
        </Level>

        <Level n={4} label="Le buffer lendemain">
          <p style={pStyle}>
            En plus de couvrir la cible d'aujourd'hui, la production intègre une <strong>avance pour le lendemain</strong>.
            Le principe : produire un certain pourcentage (par défaut <strong>40 %</strong>) de la cible du lendemain,
            pour que le point de vente ait déjà du stock à l'ouverture.
          </p>
          <p style={pStyle}>
            La formule complète est :
          </p>
          <code style={{ ...codeStyle, display: "block", margin: "8px 0", padding: "10px 14px", lineHeight: "1.8" }}>
            À produire = max(0, Cible aujourd&apos;hui − Stock) + arrondi(Cible demain × 40 %)
          </code>
          <ExampleBox>
            Croissant — cible aujourd'hui : <Num>15</Num> · stock veille : <Num>3</Num> · cible demain : <Num>20</Num><br />
            Buffer demain : arrondi(20 × 40 %) = <Num>8</Num><br />
            À produire : (15 − 3) + 8 = <Num>20</Num>
          </ExampleBox>
          <p style={pStyle}>
            La colonne <strong>Demain +X</strong> sur la fiche production détaille le buffer calculé pour chaque produit.
          </p>
          <Callout type="info">
            Si le lendemain est un jour fermé, le buffer est automatiquement mis à zéro — pas d'avance inutile.
          </Callout>
        </Level>

        <Level n={5} label="Produit prolongé — badge ⚡">
          <p style={pStyle}>
            Quand une unité a été prolongée la veille, un badge <strong>⚡ +N prolongé</strong> apparaît à côté du nom du produit.
            Ces unités sont déjà comptées dans le stock — elles réduisent le « à produire » normalement.
          </p>
          <Callout type="warn">
            Un produit prolongé <em>doit absolument être vendu aujourd'hui</em>. Ce soir, il repassera dans « À jeter » si des unités restent.
          </Callout>
        </Level>

        <Level n={6} label="Le lundi — stocks du samedi visibles">
          <p style={pStyle}>
            Le dimanche est généralement fermé : aucune saisie n'est enregistrée. Le lundi, la production regarde donc directement les restants du <strong>samedi soir</strong> pour les produits à 24 h.
          </p>
          <ExampleBox>
            Samedi soir : 4 briochettes restantes (24 h).<br />
            Dimanche : fermé, aucune saisie.<br />
            Lundi matin : stock = <Num>4</Num> (samedi), cible semaine = 12 → À produire = <Num>8</Num> (+ buffer lendemain).
          </ExampleBox>
        </Level>

      </Section>

      {/* RÉSUMÉ */}
      <Section emoji="📋" title="Résumé du flux idéal">
        <ol style={{ ...ulStyle, listStyle: "decimal inside" }}>
          <li style={{ marginBottom: "8px" }}>
            <strong>Chaque soir</strong> — saisir les restants pour chaque produit, vérifier la colonne « À jeter », gérer les prolongations éventuelles, puis <strong>clôturer</strong> la journée.
          </li>
          <li style={{ marginBottom: "8px" }}>
            <strong>Chaque matin</strong> — ouvrir la fiche Production, lire la colonne « À produire », noter les badges ⚡ et le détail du buffer lendemain.
          </li>
          <li>
            <strong>Ponctuellement</strong> — ajuster les cibles ou marquer un jour fermé dans l'onglet Admin (administrateurs uniquement).
          </li>
        </ol>
      </Section>

    </div>
  );
}

/* ── Composants internes ── */

function Section({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "10px", borderBottom: "2px solid var(--border)" }}>
        <span style={{ fontSize: "18px" }}>{emoji}</span>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", margin: 0 }}>{title}</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {children}
      </div>
    </div>
  );
}

function Level({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "10px", background: "var(--accent-soft)", color: "var(--accent)", letterSpacing: "0.04em", flexShrink: 0 }}>
          Niveau {n}
        </span>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: 0 }}>{label}</h3>
      </div>
      <div style={{ paddingLeft: "12px", borderLeft: "2px solid var(--border)" }}>
        {children}
      </div>
    </div>
  );
}

function Card({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "14px 16px", background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: "8px", borderTop: `3px solid ${accent}` }}>
      {children}
    </div>
  );
}

function Callout({ type, children }: { type: "info" | "warn"; children: React.ReactNode }) {
  const isWarn = type === "warn";
  return (
    <div style={{
      padding: "10px 14px",
      borderRadius: "6px",
      background: isWarn ? "var(--orange-soft)" : "var(--accent-soft)",
      border: `1px solid ${isWarn ? "var(--orange)" : "var(--accent)"}`,
      fontSize: "12px",
      color: "var(--text)",
      marginTop: "8px",
      lineHeight: "1.6",
    }}>
      {isWarn ? "⚠️ " : "ℹ️ "}{children}
    </div>
  );
}

function ExampleBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "10px 14px",
      borderRadius: "6px",
      background: "var(--bg-elev-2)",
      border: "1px solid var(--border)",
      fontSize: "12px",
      color: "var(--text-dim)",
      margin: "8px 0",
      lineHeight: "1.7",
    }}>
      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Exemple</span>
      {children}
    </div>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return (
    <strong style={{ color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{children}</strong>
  );
}

const pStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--text-dim)",
  lineHeight: "1.65",
  margin: "0 0 6px",
};

const ulStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--text-dim)",
  lineHeight: "1.7",
  margin: "6px 0",
  paddingLeft: "20px",
};

const codeStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono, monospace)",
  fontSize: "12px",
  background: "var(--bg-elev-2)",
  padding: "2px 6px",
  borderRadius: "4px",
  color: "var(--text)",
};
