export interface AuthIdentity {
  externalId: string;
}

export interface AuthProvider {
  verify(token: string): Promise<AuthIdentity>;
}
