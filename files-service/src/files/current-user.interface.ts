export type CurrentUserRole = 'ADMIN' | 'DENTIST' | 'PATIENT';

export interface CurrentUser {
  id: string;
  role: CurrentUserRole;
}