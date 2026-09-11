export interface AuthUser {
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN';
}
