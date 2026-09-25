export type Role = 'admin' | 'dealer'

/** The authenticated actor, as returned by /auth/login and /auth/me. */
export interface Principal {
  id: number
  role: Role
  name: string
}

export interface LoginCredentials {
  login: string
  password: string
}

export const sessionKeys = {
  root: ['session'] as const,
  me: () => [...sessionKeys.root, 'me'] as const,
}
