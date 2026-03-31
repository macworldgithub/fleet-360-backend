import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: this.configService.getOrThrow<string>('FIREBASE_PROJECT_ID'),
        privateKey: this.configService
          .getOrThrow<string>('FIREBASE_PRIVATE_KEY')
          .replace(/\\n/g, '\n'),
        clientEmail: this.configService.getOrThrow<string>(
          'FIREBASE_CLIENT_EMAIL',
        ),
      }),
    });
  }

  async sendPush(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    if (!tokens || !tokens.length) return;

    const message = {
      tokens,
      notification: {
        title,
        body,
      },
      data: data
        ? Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)]),
          )
        : {},
    };

    return admin.messaging().sendEachForMulticast(message);
  }
}
