import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { APP_ROLES_KEY } from './roles.decorator';

const power = ['READER', 'AUTHOR', 'EDITOR', 'ADMIN', 'OWNER'] as const;
type PowerRole = (typeof power)[number];

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PowerRole[]>(
      APP_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as any;
    const slug = (req.headers['x-app-slug'] as string) || 'portal';
    const role = user?.apps?.[slug] as PowerRole;

    if (!role) throw new UnauthorizedException('Sem papel para este app');

    const need = required[0];

    return power.indexOf(role) >= power.indexOf(need);
  }
}
