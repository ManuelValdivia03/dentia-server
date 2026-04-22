export enum RequestUserRole {
  ADMIN = 'ADMIN',
  DENTIST = 'DENTIST',
  PATIENT = 'PATIENT',
}

export interface RequestUser {
  sub: string;
  role: RequestUserRole;
  domainId: string;
  email: string;
}
