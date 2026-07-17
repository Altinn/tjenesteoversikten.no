import { useLang } from '../lang';

export default function AboutPage() {
  const { lang } = useLang();
  const nb = lang === 'nb';
  const facts = nb ? [
    ['Datakilde', 'Altinn ressursregister og Access Management-API-ene'],
    ['Oppdatering', 'Sanntid via offentlige API-er'],
    ['API', 'Åpen proxy: /api/v1/{miljø}/…'],
    ['MCP-server', 'Katalogen som verktøy for AI-agenter'],
  ] : [
    ['Data source', 'Altinn resource registry and Access Management APIs'],
    ['Freshness', 'Real time via public APIs'],
    ['API', 'Open proxy: /api/v1/{env}/…'],
    ['MCP server', 'The catalogue as tools for AI agents'],
  ];
  return <div className="about-page"><h1>{nb ? 'Om tjenesteoversikten' : 'About tjenesteoversikten'}</h1><p>{nb ? 'Tjenesteoversikten.no er laget av teamet bak Altinn Autorisasjon. Det er et visningslag over Altinns offentlige metadata-API-er: her ser du hvilke digitale tjenester som finnes i det offentlige Norge, hvem som eier dem, og hvilke roller og tilgangspakker som gir tilgang.' : "Tjenesteoversikten.no is built by the team behind Altinn Authorization. It is a view layer over Altinn's public metadata APIs: see which digital services exist in the Norwegian public sector, who owns them, and which roles and access packages grant access."}</p><p>{nb ? 'Alle data hentes direkte fra ressursregisteret og tilgangsstyrings-API-ene — ingenting vedlikeholdes manuelt. Løsningen tilbyr også en MCP-server, slik at AI-agenter kan slå opp i katalogen med de samme dataene.' : 'All data comes straight from the resource registry and access management APIs — nothing is maintained by hand. The solution also offers an MCP server, so AI agents can query the catalogue with the same data.'}</p><div className="fact-grid">{facts.map(([key, value]) => <article key={key}><strong>{key}</strong><span>{value}</span></article>)}</div><div className="disclaimer">{nb ? 'Dette er et uoffisielt hobby-/demoprosjekt og ikke et offisielt Altinn-produkt.' : 'This is an unofficial hobby/demo project and not an official Altinn product.'}</div></div>;
}
