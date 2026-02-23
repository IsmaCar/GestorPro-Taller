import { Injectable } from '@nestjs/common';
import * as brevo from '@getbrevo/brevo';

@Injectable()
export class EmailService {
  private brevoClient: brevo.BrevoClient;
  constructor() {
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) throw new Error('BREVO_API_KEY no está configurada en las variables de entorno');

    this.brevoClient = new brevo.BrevoClient({
      apiKey: apiKey,
    });
  }
  async sendInvitationEmail(recipientEmail: string, invitationToken: string, garageName: string) {}
}
