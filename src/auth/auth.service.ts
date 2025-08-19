import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { JwtService } from '@nestjs/jwt';
import { addDays } from 'date-fns';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private pwd: PasswordService,
  ) {}

  private toAppsMap(roles: { app: { slug: string }; role: string }[]) {
    return roles.reduce(
      (acc, r) => {
        acc[r.app.slug] = r.role;
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  async register(email: string, password: string, name?: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });

    if (exists) throw new UnauthorizedException('E-mail já cadastrado.');

    const hash = await this.pwd.hash(password);
    const user = await this.prisma.user.create({
      data: { email, password: hash, name },
    });

    return { id: user.id };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) return null;

    const ok = await this.pwd.compare(password, user.password);

    return ok ? user : null;
  }

  signAccess(user: any, appsMap: Record<string, string>) {
    const payload = {
      sub: user.id,
      email: user.email,
      globalRole: user.role,
      apps: appsMap,
      iss: 'trevvos-auth',
    };

    return this.jwt.sign(payload, {
      expiresIn: process.env.AUTH_JWT_EXPIRES || '15m',
    });
  }

  async issueTokens(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    const roles = await this.prisma.userAppRole.findMany({
      where: { userId },
      select: { role: true, app: { select: { slug: true } } },
    });

    const appsMap = this.toAppsMap(roles);

    const accessToken = this.signAccess(user, appsMap);

    const refreshPlain = crypto.randomUUID() + '.' + crypto.randomUUID();

    const expiresAt = addDays(
      new Date(),
      Number(process.env.AUTH_REFRESH_EXPIRES_DAYS || 30),
    );

    const bcryt = (await import('bcrypt')).default;
    const hashed = await bcryt.hash(refreshPlain, 10);

    await this.prisma.session.create({
      data: { userId, refreshToken: hashed, expiresAt },
    });

    return { accessToken, refreshToken: refreshPlain };
  }

  async refresh(refreshToken: string) {
    const sessions = await this.prisma.session.findMany({
      where: { expiresAt: { gt: new Date() } },
    });

    const bcrypt = (await import('bcrypt')).default;

    for (const s of sessions) {
      if (await bcrypt.compare(refreshToken, s.refreshToken)) {
        await this.prisma.session.delete({ where: { id: s.id } });
        return this.issueTokens(s.userId);
      }
    }
    throw new UnauthorizedException('Refresh inválido');
  }

  async logout(refreshToken: string) {
    const sessions = await this.prisma.session.findMany({});
    const bcrypt = (await import('bcrypt')).default;
    for (const s of sessions) {
      if (await bcrypt.compare(refreshToken, s.refreshToken)) {
        await this.prisma.session.delete({ where: { id: s.id } });
      }
    }
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    const roles = await this.prisma.userAppRole.findMany({
      where: { userId },
      select: {
        role: true,
        app: { select: { slug: true, name: true } },
      },
    });

    return {
      user,
      apps: roles.map((r) => ({
        slug: r.app.slug,
        name: r.app.name,
        role: r.role,
      })),
    };
  }
}
