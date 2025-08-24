export type JwtPayload = {
  sub: string; // ID do usuário
  email: string;
  globalRole: string;
  apps?: Record<string, string>; // Ex: { "portal": "OWNER", "kmone": "ADMIN" }
};
