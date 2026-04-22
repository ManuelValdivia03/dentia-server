import { UserRole } from '../../auth/enums/user-role.enum';

export interface RequestUser {
  sub: string;
  role: UserRole;
  domainId: string;
  email: string;
}
