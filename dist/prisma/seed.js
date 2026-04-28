"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcryptjs_1 = require("bcryptjs");
const prisma = new client_1.PrismaClient({
    adapter: new adapter_pg_1.PrismaPg({
        connectionString: process.env.DATABASE_URL ?? '',
    }),
});
const clients = [
    {
        id: 'techcorp',
        name: 'TechCorp Inc.',
        shortName: 'TC',
        industry: 'Tecnologia',
        description: 'SaaS B2B para automatizacion comercial.',
        status: client_1.ClientStatus.ACTIVO,
        connected: true,
        avatarColor: '#0f766e',
    },
    {
        id: 'elbuen-sabor',
        name: 'Restaurante El Buen Sabor',
        shortName: 'RBS',
        industry: 'Gastronomia',
        description: 'Restaurante con menu estacional y delivery propio.',
        status: client_1.ClientStatus.ACTIVO,
        connected: true,
        avatarColor: '#b45309',
    },
    {
        id: 'moda-viva',
        name: 'Moda Viva',
        shortName: 'MV',
        industry: 'Retail',
        description: 'Marca de ropa urbana con ecommerce en crecimiento.',
        status: client_1.ClientStatus.PENDIENTE,
        connected: false,
        avatarColor: '#7c3aed',
    },
    {
        id: 'biofit-bol',
        name: 'BioFit Bolivia',
        shortName: 'BF',
        industry: 'Salud y bienestar',
        description: 'Suplementos y asesorias para estilo de vida saludable.',
        status: client_1.ClientStatus.SIN_CUENTA,
        connected: false,
        avatarColor: '#2563eb',
    },
];
const accounts = [
    {
        id: 'acc-rbs-ig',
        clientId: 'elbuen-sabor',
        platform: 'Instagram Business',
        handle: '@elbuen_sabor',
        igBusinessId: '17841400000000000',
        facebookPage: 'El Buen Sabor Oficial',
        scopes: ['instagram_basic', 'instagram_manage_comments', 'pages_show_list', 'pages_read_engagement'],
        status: client_1.AccountStatus.CONECTADO,
        lastSyncAt: new Date(Date.now() - 5 * 60 * 1000),
    },
    {
        id: 'acc-tc-ig',
        clientId: 'techcorp',
        platform: 'Instagram Business',
        handle: '@techcorp.latam',
        igBusinessId: '17841400000000091',
        facebookPage: 'TechCorp LATAM',
        scopes: ['instagram_basic', 'instagram_manage_comments'],
        status: client_1.AccountStatus.CONECTADO,
        lastSyncAt: new Date(Date.now() - 26 * 60 * 1000),
    },
    {
        id: 'acc-mv-ig',
        clientId: 'moda-viva',
        platform: 'Instagram Business',
        handle: '@modaviva.bo',
        igBusinessId: null,
        facebookPage: null,
        scopes: [],
        status: client_1.AccountStatus.PENDIENTE,
        lastSyncAt: null,
    },
];
const postDateMap = {
    'post-rbs-01': new Date('2025-04-12T12:00:00.000Z'),
    'post-rbs-02': new Date('2025-04-19T12:00:00.000Z'),
    'post-tc-01': new Date('2025-05-03T12:00:00.000Z'),
    'post-tc-02': new Date('2025-05-10T12:00:00.000Z'),
    'post-mv-01': new Date('2025-03-29T12:00:00.000Z'),
};
const posts = [
    {
        id: 'post-rbs-01',
        clientId: 'elbuen-sabor',
        accountId: 'acc-rbs-ig',
        caption: 'Menu de verano con ingredientes frescos.',
        imageHint: 'Pasta artesanal en plato rustico',
        likes: 1240,
        commentsCount: 85,
        analyzedComments: 72,
    },
    {
        id: 'post-rbs-02',
        clientId: 'elbuen-sabor',
        accountId: 'acc-rbs-ig',
        caption: 'Combo familiar para fin de semana.',
        imageHint: 'Mesa con platos para compartir',
        likes: 873,
        commentsCount: 42,
        analyzedComments: 29,
    },
    {
        id: 'post-tc-01',
        clientId: 'techcorp',
        accountId: 'acc-tc-ig',
        caption: 'Lanzamos dashboard de ventas en tiempo real.',
        imageHint: 'Pantalla analitica con graficas',
        likes: 250,
        commentsCount: 39,
        analyzedComments: 35,
    },
    {
        id: 'post-tc-02',
        clientId: 'techcorp',
        accountId: 'acc-tc-ig',
        caption: 'Webinar gratuito sobre automatizacion comercial.',
        imageHint: 'Ponente en conferencia virtual',
        likes: 182,
        commentsCount: 24,
        analyzedComments: 18,
    },
    {
        id: 'post-mv-01',
        clientId: 'moda-viva',
        accountId: 'acc-mv-ig',
        caption: 'Nueva coleccion capsula otono 2025.',
        imageHint: 'Modelo con prendas urbanas',
        likes: 498,
        commentsCount: 111,
        analyzedComments: 0,
    },
];
const comments = [
    {
        id: 'c-rbs-1',
        postId: 'post-rbs-01',
        username: '@maria.l',
        text: 'La pasta estaba deliciosa, volveria 100 veces.',
        likes: 12,
        createdAt: relativeHoursAgo(2),
        sentiment: client_1.Sentiment.POSITIVO,
        emotion: 'Joy',
        confidence: 0.98,
        status: client_1.AnalysisStatus.analyzed,
    },
    {
        id: 'c-rbs-2',
        postId: 'post-rbs-01',
        username: '@carlos.r',
        text: 'El servicio fue excelente, muy rapido y amable.',
        likes: 7,
        createdAt: relativeHoursAgo(5),
        sentiment: client_1.Sentiment.POSITIVO,
        emotion: 'Love',
        confidence: 0.94,
        status: client_1.AnalysisStatus.analyzed,
    },
    {
        id: 'c-rbs-3',
        postId: 'post-rbs-01',
        username: '@andrea.m',
        text: 'El precio me parecio alto para lo que ofrecen.',
        likes: 2,
        createdAt: relativeDaysAgo(1),
        sentiment: client_1.Sentiment.NEGATIVO,
        emotion: 'Anger',
        confidence: 0.87,
        status: client_1.AnalysisStatus.analyzed,
    },
    {
        id: 'c-rbs-4',
        postId: 'post-rbs-01',
        username: '@pedro.g',
        text: 'Tienen opciones vegetarianas para mi proxima visita?',
        likes: 0,
        createdAt: relativeDaysAgo(2),
        sentiment: client_1.Sentiment.NEUTRAL,
        emotion: 'Surprise',
        confidence: 0.79,
        status: client_1.AnalysisStatus.analyzed,
    },
    {
        id: 'c-rbs-5',
        postId: 'post-rbs-01',
        username: '@juan.t',
        text: 'Cual es el horario del fin de semana?',
        likes: 1,
        createdAt: relativeDaysAgo(4),
        sentiment: null,
        emotion: null,
        confidence: null,
        status: client_1.AnalysisStatus.pending,
    },
    {
        id: 'c-rbs-lucia',
        postId: 'post-rbs-01',
        username: '@lucia.s',
        text: 'Me encanto el ambiente del lugar, muy acogedor.',
        likes: 18,
        createdAt: relativeDaysAgo(3),
        sentiment: client_1.Sentiment.POSITIVO,
        emotion: 'Love',
        confidence: 0.96,
        status: client_1.AnalysisStatus.analyzed,
    },
    {
        id: 'c-rbs-6',
        postId: 'post-rbs-02',
        username: '@laura.b',
        text: 'Excelente promocion para ir con toda la familia.',
        likes: 4,
        createdAt: relativeHoursAgo(7),
        sentiment: client_1.Sentiment.POSITIVO,
        emotion: 'Joy',
        confidence: 0.9,
        status: client_1.AnalysisStatus.analyzed,
    },
    {
        id: 'c-rbs-7',
        postId: 'post-rbs-02',
        username: '@dani.p',
        text: 'La porcion vino mas pequena de lo esperado.',
        likes: 2,
        createdAt: relativeHoursAgo(11),
        sentiment: client_1.Sentiment.NEGATIVO,
        emotion: 'Sadness',
        confidence: 0.73,
        status: client_1.AnalysisStatus.analyzed,
    },
    {
        id: 'c-tc-1',
        postId: 'post-tc-01',
        username: '@ana.pm',
        text: 'La nueva vista de metricas esta buenisima.',
        likes: 8,
        createdAt: relativeHoursAgo(3),
        sentiment: client_1.Sentiment.POSITIVO,
        emotion: 'Joy',
        confidence: 0.93,
        status: client_1.AnalysisStatus.analyzed,
    },
    {
        id: 'c-tc-2',
        postId: 'post-tc-01',
        username: '@leo.dev',
        text: 'No me cargo bien en movil, revisen por favor.',
        likes: 3,
        createdAt: relativeDaysAgo(1),
        sentiment: client_1.Sentiment.NEGATIVO,
        emotion: 'Anger',
        confidence: 0.81,
        status: client_1.AnalysisStatus.analyzed,
    },
    {
        id: 'c-tc-3',
        postId: 'post-tc-02',
        username: '@lu.ma',
        text: 'Habra grabacion del webinar?',
        likes: 0,
        createdAt: relativeDaysAgo(1),
        sentiment: null,
        emotion: null,
        confidence: null,
        status: client_1.AnalysisStatus.pending,
    },
];
async function main() {
    const initialPasswordHash = await (0, bcryptjs_1.hash)('bio123', 10);
    await prisma.user.upsert({
        where: { email: 'bionet@gmail.com' },
        create: {
            email: 'bionet@gmail.com',
            passwordHash: initialPasswordHash,
            fullName: 'Bionet Ramirez',
            role: client_1.UserRole.ADMIN,
            isActive: true,
        },
        update: {
            passwordHash: initialPasswordHash,
            fullName: 'Bionet Ramirez',
            role: client_1.UserRole.ADMIN,
            isActive: true,
        },
    });
    await prisma.commentAnalysis.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.postMetric.deleteMany();
    await prisma.post.deleteMany();
    await prisma.oauthToken.deleteMany();
    await prisma.oauthState.deleteMany();
    await prisma.syncRun.deleteMany();
    await prisma.socialAccount.deleteMany();
    await prisma.client.deleteMany();
    for (const client of clients) {
        await prisma.client.create({ data: client });
    }
    for (const account of accounts) {
        await prisma.socialAccount.create({ data: account });
        if (account.status === client_1.AccountStatus.CONECTADO) {
            await prisma.oauthToken.create({
                data: {
                    accountId: account.id,
                    encryptedAccessToken: `seed:access:${account.id}`,
                    encryptedLongLivedToken: `seed:long:${account.id}`,
                    expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
                    scope: account.scopes.join(','),
                },
            });
        }
    }
    for (const post of posts) {
        await prisma.post.create({
            data: {
                ...post,
                publishedAt: postDateMap[post.id] ?? new Date(),
            },
        });
    }
    for (const comment of comments) {
        await prisma.comment.create({
            data: {
                id: comment.id,
                postId: comment.postId,
                username: comment.username,
                text: comment.text,
                likes: comment.likes,
                createdAt: comment.createdAt,
            },
        });
        await prisma.commentAnalysis.create({
            data: {
                commentId: comment.id,
                postId: comment.postId,
                sentiment: comment.sentiment,
                emotion: comment.emotion,
                confidence: comment.confidence,
                status: comment.status,
                analyzedAt: comment.status === client_1.AnalysisStatus.analyzed ? new Date() : null,
            },
        });
    }
    for (const post of posts) {
        const analysis = await prisma.commentAnalysis.findMany({ where: { postId: post.id } });
        const positive = analysis.filter((row) => row.sentiment === client_1.Sentiment.POSITIVO).length;
        const negative = analysis.filter((row) => row.sentiment === client_1.Sentiment.NEGATIVO).length;
        const neutral = analysis.filter((row) => row.sentiment === client_1.Sentiment.NEUTRAL).length;
        await prisma.postMetric.create({
            data: {
                postId: post.id,
                clientId: post.clientId,
                likes: post.likes,
                comments: post.commentsCount,
                engagement: Number(((post.likes + post.commentsCount) / 25000).toFixed(3)),
                positive,
                negative,
                neutral,
            },
        });
    }
    await prisma.syncRun.createMany({
        data: [
            {
                trigger: client_1.SyncTrigger.manual,
                status: client_1.SyncRunStatus.success,
                clientId: 'elbuen-sabor',
                accountId: 'acc-rbs-ig',
                startedAt: relativeHoursAgo(2),
                finishedAt: relativeHoursAgo(2),
                postsSynced: 24,
                commentsSynced: 1842,
                analyzedCount: 72,
            },
            {
                trigger: client_1.SyncTrigger.cron,
                status: client_1.SyncRunStatus.success,
                clientId: 'techcorp',
                accountId: 'acc-tc-ig',
                startedAt: relativeHoursAgo(1),
                finishedAt: relativeHoursAgo(1),
                postsSynced: 16,
                commentsSynced: 492,
                analyzedCount: 53,
            },
        ],
    });
    console.log('Seed completed');
}
function relativeHoursAgo(hours) {
    return new Date(Date.now() - hours * 60 * 60 * 1000);
}
function relativeDaysAgo(days) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
main()
    .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map