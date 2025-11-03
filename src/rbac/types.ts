export type Action = 'read' | 'write' | 'delete' | '*';

export type Resource =
  | 'finbot.accounts'
  | 'finbot.transactions'
  | 'finbot.budgets'
  | 'seo'
  | '*';

export interface Permission {
  resource: Resource;
  action: Action;
}

export type RoleName = 'admin' | 'finance_analyst' | 'accountant' | 'viewer' | 'seo_analyst';

export interface AuthUser {
  id: string;
  roles: RoleName[];
}

