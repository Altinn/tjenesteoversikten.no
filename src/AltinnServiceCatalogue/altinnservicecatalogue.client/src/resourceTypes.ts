export const RESOURCE_TYPE_HEX_COLORS: Record<string, string> = {
  Default: '#6B7A93',
  Systemresource: '#2F8C82',
  MaskinportenSchema: '#9B7BE8',
  Altinn2Service: '#2FA875',
  AltinnApp: '#4098E8',
  GenericAccessResource: '#C98A2A',
  BrokerService: '#E07732',
  CorrespondenceService: '#D96A6A',
  Consent: '#C25B9B',
  MigratedApp: '#4F8C9D',
};

const FALLBACK_RESOURCE_TYPE_COLOR = '#6B7A93';

export function getResourceTypeColor(type: string) {
  return RESOURCE_TYPE_HEX_COLORS[type] ?? FALLBACK_RESOURCE_TYPE_COLOR;
}
