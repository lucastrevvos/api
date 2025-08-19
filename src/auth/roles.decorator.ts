import { SetMetadata } from '@nestjs/common';

export const APP_ROLES_KEY = 'app_roles';

export const AppRoles = (...roles: string[]) =>
  SetMetadata(APP_ROLES_KEY, roles);
