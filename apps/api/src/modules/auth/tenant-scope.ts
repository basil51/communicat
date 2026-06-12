import { FindOptionsWhere, IsNull } from 'typeorm';

/**
 * Who is asking, for row-level isolation purposes.
 * - Dashboard JWT users are admins: they see every tenant's rows.
 * - API keys are scoped to their tenant; keys without a tenant (legacy/platform
 *   keys) only see rows with tenant_id IS NULL.
 */
export interface TenantScope {
  admin: boolean;
  tenantId: string | null;
}

export function scopeFromRequest(req: any): TenantScope {
  if (req.user) return { admin: true, tenantId: null };
  return { admin: false, tenantId: req.apiKey?.tenantId ?? null };
}

/** Where-clause fragment enforcing the scope. Empty for admins. */
export function tenantWhere(scope: TenantScope): FindOptionsWhere<{ tenantId: string | null }> {
  if (scope.admin) return {};
  return { tenantId: scope.tenantId ?? IsNull() };
}

/** tenant_id value to stamp on rows created under this scope. */
export function tenantIdForCreate(scope: TenantScope, requestedTenantId?: string | null): string | null {
  // Only admins may choose a tenant explicitly; API keys always write their own.
  if (scope.admin) return requestedTenantId ?? null;
  return scope.tenantId;
}
