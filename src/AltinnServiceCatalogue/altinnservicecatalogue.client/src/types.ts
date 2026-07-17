export interface Org {
  name: Record<string, string>;
  logo?: string;
  orgnr: string;
  homepage?: string;
  environments: string[];
}

export interface OrgList {
  orgs: Record<string, Org>;
}

export interface CompetentAuthority {
  name: Record<string, string>;
  organization: string;
  orgcode: string;
}

export interface ContactPoint {
  category?: string;
  email?: string;
  telephone?: string;
  contactPage?: string;
}

export interface ResourceReference {
  referenceSource?: string;
  reference?: string;
  referenceType?: string;
}

export interface Keyword {
  word: string;
  language: string;
}

export interface AuthorizationReferenceAttribute {
  id: string;
  value: string;
}

export interface ServiceResource {
  identifier: string;
  version?: string;
  title: Record<string, string>;
  description: Record<string, string>;
  rightDescription?: Record<string, string>;
  homepage?: string;
  status?: string;
  spatial?: string[];
  contactPoints?: ContactPoint[];
  produces?: string[];
  isPartOf?: string;
  thematicAreas?: string[];
  resourceReferences?: ResourceReference[];
  delegable: boolean;
  visible: boolean;
  hasCompetentAuthority: CompetentAuthority;
  keywords?: Keyword[];
  accessListMode: string;
  selfIdentifiedUserEnabled: boolean;
  enterpriseUserEnabled: boolean;
  resourceType: string;
  availableForType?: string[];
  authorizationReference?: AuthorizationReferenceAttribute[];
  consentTemplate?: string;
  consentText?: Record<string, string>;
  isOneTimeConsent: boolean;
  versionId: number;
}

export interface ResourceSummary {
  identifier: string;
  title: Record<string, string>;
  description: Record<string, string>;
  status?: string;
  delegable: boolean;
  visible: boolean;
  hasCompetentAuthority?: CompetentAuthority;
  resourceType: string;
}

// Access Management Metadata types

export interface MetaProviderType {
  id: string;
  name: string;
}

export interface MetaResourceType {
  id: string;
  name: string;
}

export interface MetaProvider {
  id: string;
  name: string;
  refId?: string;
  logoUrl?: string;
  code?: string;
  typeId?: string;
  type?: MetaProviderType;
}

export interface MetaType {
  id: string;
  providerId?: string;
  name: string;
  provider?: MetaProvider;
}

export interface MetaResource {
  id: string;
  providerId?: string;
  typeId?: string;
  name: string;
  description?: string;
  refId: string;
  provider?: MetaProvider;
  type?: MetaResourceType;
}

export interface PackageDto {
  id: string;
  name: string;
  urn: string;
  description: string;
  /** English texts merged client-side from the language=eng export */
  nameEn?: string;
  descriptionEn?: string;
  isDelegable: boolean;
  isAssignable: boolean;
  isResourcePolicyAvailable: boolean;
  area?: AreaDto;
  type?: MetaType;
  resources?: MetaResource[];
}

export interface AreaDto {
  id: string;
  name: string;
  urn: string;
  description: string;
  iconUrl?: string;
  packages?: PackageDto[];
  group?: AreaGroupDto;
}

export interface AreaGroupDto {
  id: string;
  name: string;
  urn: string;
  description: string;
  type: string;
  areas?: AreaDto[];
}

// Roles

/** Packages a role grants for one specific entity variant (organization form), e.g. NUF/ESEK/BRL. */
export interface RoleVariantPackagesDto {
  variantName: string;
  variantDescription?: string;
  packages: PackageDto[];
}

export interface RoleDto {
  id: string;
  name: string;
  code: string;
  description: string;
  isKeyRole: boolean;
  urn: string;
  legacyRoleCode?: string;
  legacyUrn?: string;
  isResourcePolicyAvailable: boolean;
  provider?: MetaProvider;
}

// Subject resources (bysubjects response)

export interface SubjectAttribute {
  type: string;
  value: string;
  urn: string;
}

export interface SubjectResourcesEntry {
  subject: SubjectAttribute;
  resources: SubjectAttribute[];
}

export interface SubjectResourcesResponse {
  links: Record<string, string>;
  data: SubjectResourcesEntry[];
}

// Policy rights (v2 API)

export interface AttributeMatch {
  type: string;
  value: string;
}

export interface ResourceRight {
  key: string;
  name: string;
  resource: AttributeMatch[];
  action: AttributeMatch;
}

// Policy rules

export interface PolicyRuleSubject {
  type: string;
  value: string;
}

export interface PolicyRuleAction {
  type: string;
  value: string;
}

export interface PolicyRule {
  subject: PolicyRuleSubject[];
  action: PolicyRuleAction;
  resource: { type: string; value: string }[];
}

// Statistics types

export interface AppAuthLevelEntry {
  identifier: string;
  title: Record<string, string>;
  hasCompetentAuthority?: CompetentAuthority;
  userLevel: number | null;
  orgLevel: number | null;
  error: boolean;
}

export interface AuthLevelStatistics {
  totalApps: number;
  level4Apps: AppAuthLevelEntry[];
  level3Apps: AppAuthLevelEntry[];
  level2Apps: AppAuthLevelEntry[];
  otherApps: AppAuthLevelEntry[];
  errorCount: number;
}

export interface StatsJobStatus {
  status: 'running' | 'done' | 'error' | 'not_started';
  progress?: number;
  total?: number;
  result?: AuthLevelStatistics;
  error?: string;
}

export interface PolicyAccessPackageEntry {
  identifier: string;
  title: Record<string, string>;
  hasCompetentAuthority?: CompetentAuthority;
  resourceType: string | null;
  accessPackageCount: number;
  subjectCount: number;
  error: boolean;
}

export interface AccessPackageStatistics {
  totalPolicies: number;
  withAccessPackages: number;
  withoutAccessPackages: PolicyAccessPackageEntry[];
  errorCount: number;
}

export interface AccessPackageStatsJobStatus {
  status: 'running' | 'done' | 'error' | 'not_started';
  progress?: number;
  total?: number;
  result?: AccessPackageStatistics;
  error?: string;
}

export interface CaseSensitiveMatch {
  category: 'role' | 'action' | 'accesspackage' | string;
  attributeId: string;
  value: string;
  matchFunction: string;
}

export interface PolicyCaseSensitiveEntry {
  identifier: string;
  title: Record<string, string>;
  hasCompetentAuthority?: CompetentAuthority;
  resourceType: string | null;
  hasRoleIssue: boolean;
  hasActionIssue: boolean;
  hasAccessPackageIssue: boolean;
  matches: CaseSensitiveMatch[];
  error: boolean;
}

export interface CaseSensitiveStatistics {
  totalPolicies: number;
  withIssues: number;
  roleIssues: number;
  actionIssues: number;
  accessPackageIssues: number;
  affected: PolicyCaseSensitiveEntry[];
  errorCount: number;
}

export interface CaseSensitiveStatsJobStatus {
  status: 'running' | 'done' | 'error' | 'not_started';
  progress?: number;
  total?: number;
  result?: CaseSensitiveStatistics;
  error?: string;
}
