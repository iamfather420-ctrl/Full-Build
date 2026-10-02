export type ClientRole = 'OWNER' | 'ADMIN' | 'VERIFIER' | 'CUSTOMER';
export interface ClientUserContext {
  user_id: string;
  tenant_id: string;
  email: string;
  role: ClientRole;
}
