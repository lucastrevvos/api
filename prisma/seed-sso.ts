import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const apps = [
    { slug: 'portal', name: 'Portal Trevvos' },
    { slug: 'kmone', name: 'Km One' },
    { slug: 'controllar', name: 'Controllar' },
    { slug: 'sports', name: 'Sports Connect' },
  ];

  const user = await prisma.user.findFirst({
    where: { email: 'admin@trevvos.com.br' },
  });

  if (!user) {
    throw new Error(
      'Usuário admin@trevvos.com.br não encontrado. Registre antes de rodar o seed',
    );
  }

  for (const app of apps) {
    const created = await prisma.app.upsert({
      where: { slug: app.slug },
      update: {},
      create: {
        slug: app.slug,
        name: app.name,
      },
    });

    await prisma.userAppRole.upsert({
      where: {
        userId_appId: {
          userId: user.id,
          appId: created.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        appId: created.id,
        role: 'OWNER',
      },
    });

    console.log(`App "${app.slug}" criado e associado como OWNER`);
  }

  console.log(`\n Seed concluído com sucesso.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
