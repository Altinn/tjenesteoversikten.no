import { Link } from 'react-router-dom';
import { useLang } from '../lang';

export default function AboutPage() {
  const { lang } = useLang();
  const nb = lang === 'nb';
  const facts = nb ? [
    ['Datakilde', 'Altinn ressursregister og Access Management-API-ene'],
    ['Oppdatering', 'Åpne API-er; flere oppslag mellomlagres i 30 minutter'],
    ['API', 'Åpen proxy: /api/v1/{miljø}/…'],
    ['MCP-server', 'Katalogen som verktøy for AI-agenter'],
  ] : [
    ['Data source', 'Altinn resource registry and Access Management APIs'],
    ['Freshness', 'Public APIs; several lookups cached for 30 minutes'],
    ['API', 'Open proxy: /api/v1/{env}/…'],
    ['MCP server', 'The catalogue as tools for AI agents'],
  ];
  return <div className="about-page"><h1>{nb ? 'Om tjenesteoversikten' : 'About tjenesteoversikten'}</h1><p>{nb ? 'Tjenesteoversikten.no er laget av teamet bak Altinn Autorisasjon. Det er et visningslag over Altinns offentlige metadata-API-er: her ser du hvilke digitale tjenester som finnes i det offentlige Norge, hvem som eier dem, og hvilke roller og tilgangspakker som gir tilgang.' : "Tjenesteoversikten.no is built by the team behind Altinn Authorization. It is a view layer over Altinn's public metadata APIs: see which digital services exist in the Norwegian public sector, who owns them, and which roles and access packages grant access."}</p><p>{nb ? 'Katalogdata hentes fra ressursregisteret og metadata-API-ene for tilgangsstyring. Koblinger og statistikk beregnes fra disse dataene, mens forklaringer og veiledning er skrevet i løsningen. Løsningen tilbyr også en MCP-server, slik at AI-agenter kan slå opp i katalogen med de samme dataene.' : 'Catalogue data comes from the resource registry and access management metadata APIs. Relationships and statistics are derived from this data, while explanations and guidance are authored in this application. The solution also offers an MCP server, so AI agents can query the catalogue with the same data.'}</p><div className="fact-grid">{facts.map(([key, value]) => <article key={key}><strong>{key}</strong><span>{value}</span></article>)}</div><Link to="/about/data" className="about-data-link"><strong>{nb ? 'Data, kilder og åpenhet' : 'Data, sources and openness'}</strong><span>{nb ? 'Les om opplysningene vi viser, hvor de kommer fra, og forskjellen på åpne tjenestebeskrivelser og faktiske tilganger. Her finner du også ofte stilte spørsmål.' : 'Learn what we display, where it comes from, and how public service descriptions differ from actual access. Includes frequently asked questions.'}</span><b>{nb ? 'Les om datagrunnlaget →' : 'Read about the data →'}</b></Link><div className="disclaimer">{nb ? 'Dette er et uoffisielt hobby-/demoprosjekt og ikke et offisielt Altinn-produkt.' : 'This is an unofficial hobby/demo project and not an official Altinn product.'}</div></div>;
}
