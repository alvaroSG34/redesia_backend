import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, ClientStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { firstValueFrom } from 'rxjs';

import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../security/crypto.service';

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

@Injectable()
export class MetaService {
  private readonly graphBase = 'https://graph.facebook.com/v22.0';
  private readonly appId = process.env.META_APP_ID ?? '';
  private readonly appSecret = process.env.META_APP_SECRET ?? '';
  private readonly redirectUri = process.env.META_REDIRECT_URI ?? '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
    private readonly crypto: CryptoService,
  ) {}

  async createOauthUrl(clientId: string, scopes?: string[]) {
    this.assertMetaConfig();

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) {
      throw new NotFoundException(`Client '${clientId}' not found`);
    }

    const nonce = randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.oauthState.create({
      data: {
        nonce,
        clientId,
        expiresAt,
      },
    });

    const requestedScopes =
      scopes && scopes.length > 0
        ? scopes.join(',')
        : 'instagram_basic,instagram_manage_comments,pages_show_list,pages_read_engagement';

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      state: nonce,
      scope: requestedScopes,
    });

    return {
      clientId,
      state: nonce,
      url: `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async handleCallback(state: string, code: string) {
    this.assertMetaConfig();

    const oauthState = await this.prisma.oauthState.findUnique({
      where: { nonce: state },
    });
    if (!oauthState) {
      throw new NotFoundException('OAuth state not found');
    }

    if (oauthState.usedAt) {
      throw new Error('OAuth state already used');
    }

    if (oauthState.expiresAt.getTime() < Date.now()) {
      throw new Error('OAuth state expired');
    }

    const shortToken = await this.exchangeCodeForToken(code);
    const longToken = await this.exchangeLongLivedToken(
      shortToken.access_token,
    );

    const pageData = await this.fetchPrimaryInstagramPage(
      longToken.access_token,
    ).catch(() => null);

    const existing = await this.prisma.socialAccount.findFirst({
      where: { clientId: oauthState.clientId, platform: 'Instagram Business' },
      orderBy: { createdAt: 'asc' },
    });

    const account = existing
      ? await this.prisma.socialAccount.update({
          where: { id: existing.id },
          data: {
            handle: pageData?.instagramHandle ?? existing.handle,
            igBusinessId: pageData?.igBusinessId ?? existing.igBusinessId,
            facebookPage: pageData?.pageName ?? existing.facebookPage,
            scopes: pageData?.scopes ?? existing.scopes,
            status: AccountStatus.CONECTADO,
          },
        })
      : await this.prisma.socialAccount.create({
          data: {
            clientId: oauthState.clientId,
            platform: 'Instagram Business',
            handle:
              pageData?.instagramHandle ??
              `@${oauthState.clientId.replace('-', '_')}`,
            igBusinessId: pageData?.igBusinessId,
            facebookPage: pageData?.pageName,
            scopes: pageData?.scopes ?? [],
            status: AccountStatus.CONECTADO,
          },
        });

    const expiresAt = longToken.expires_in
      ? new Date(Date.now() + longToken.expires_in * 1000)
      : undefined;

    await this.prisma.$transaction([
      this.prisma.oauthToken.upsert({
        where: { accountId: account.id },
        create: {
          accountId: account.id,
          encryptedAccessToken: this.crypto.encrypt(shortToken.access_token),
          encryptedLongLivedToken: this.crypto.encrypt(longToken.access_token),
          expiresAt,
          scope: pageData?.scopes?.join(',') ?? undefined,
        },
        update: {
          encryptedAccessToken: this.crypto.encrypt(shortToken.access_token),
          encryptedLongLivedToken: this.crypto.encrypt(longToken.access_token),
          expiresAt,
          scope: pageData?.scopes?.join(',') ?? undefined,
        },
      }),
      this.prisma.oauthState.update({
        where: { nonce: state },
        data: { usedAt: new Date() },
      }),
      this.prisma.client.update({
        where: { id: oauthState.clientId },
        data: { connected: true, status: ClientStatus.ACTIVO },
      }),
    ]);

    return {
      ok: true,
      clientId: oauthState.clientId,
      accountId: account.id,
      connected: true,
    };
  }

  private async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    const response = await firstValueFrom(
      this.http.get<TokenResponse>(`${this.graphBase}/oauth/access_token`, {
        params: {
          client_id: this.appId,
          client_secret: this.appSecret,
          redirect_uri: this.redirectUri,
          code,
        },
        timeout: 12000,
      }),
    );

    return response.data;
  }

  private assertMetaConfig(): void {
    const hasPlaceholder = (value: string) =>
      !value || value.trim() === '' || value.includes('replace_me');

    if (hasPlaceholder(this.appId) || hasPlaceholder(this.appSecret)) {
      throw new BadRequestException(
        'Meta OAuth no configurado. Define META_APP_ID y META_APP_SECRET en backend/.env con credenciales reales.',
      );
    }

    if (hasPlaceholder(this.redirectUri)) {
      throw new BadRequestException(
        'Meta OAuth no configurado. Define META_REDIRECT_URI en backend/.env y configuralo tambien en Meta Developers.',
      );
    }
  }

  private async exchangeLongLivedToken(
    shortToken: string,
  ): Promise<TokenResponse> {
    const response = await firstValueFrom(
      this.http.get<TokenResponse>(`${this.graphBase}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: shortToken,
        },
        timeout: 12000,
      }),
    );

    return response.data;
  }

  private async fetchPrimaryInstagramPage(accessToken: string): Promise<{
    pageName?: string;
    igBusinessId?: string;
    instagramHandle?: string;
    scopes: string[];
  }> {
    const pagesResponse = await firstValueFrom(
      this.http.get<{
        data: Array<{
          id: string;
          name: string;
          tasks?: string[];
          perms?: string[];
        }>;
      }>(`${this.graphBase}/me/accounts`, {
        params: { access_token: accessToken },
        timeout: 12000,
      }),
    );

    const page = pagesResponse.data.data?.[0];
    if (!page) {
      return { scopes: [] };
    }

    const detailsResponse = await firstValueFrom(
      this.http.get<{
        id: string;
        name: string;
        instagram_business_account?: { id: string; username?: string };
      }>(`${this.graphBase}/${page.id}`, {
        params: {
          fields: 'id,name,instagram_business_account{id,username}',
          access_token: accessToken,
        },
        timeout: 12000,
      }),
    );

    return {
      pageName: detailsResponse.data.name,
      igBusinessId: detailsResponse.data.instagram_business_account?.id,
      instagramHandle: detailsResponse.data.instagram_business_account?.username
        ? `@${detailsResponse.data.instagram_business_account.username}`
        : undefined,
      scopes: page.perms ?? page.tasks ?? [],
    };
  }
}
