import { Injectable } from '@nestjs/common';
import * as brevo from '@getbrevo/brevo';

@Injectable()
export class EmailService {
  private brevoClient: brevo.BrevoClient;
  private frontendUrl: string;
  private fromEmail: string;
  private fromName: string;
  constructor() {
    const apiKey = process.env.BREVO_API_KEY;
    const frontendUrl = process.env.FRONTEND_URL;
    const fromEmail = process.env.FROM_EMAIL;
    const fromName = process.env.FROM_NAME;

    if (!apiKey) throw new Error('BREVO_API_KEY no está configurada en las variables de entorno');
    if (!frontendUrl) throw new Error('FRONTEND_URL no está configurada');
    if (!fromEmail) throw new Error('FROM_EMAIL no está configurada');
    if (!fromName) throw new Error('FROM_NAME no está configurada');

    this.frontendUrl = frontendUrl;
    this.fromEmail = fromEmail;
    this.fromName = fromName;
    this.brevoClient = new brevo.BrevoClient({
      apiKey: apiKey,
    });
  }

  async sendInvitationEmail(
    recipientEmail: string,
    invitationToken: string,
    garageName: string,
  ): Promise<{ success: boolean; messageId?: string }> {
    const backendUrl = process.env.BACKEND_URL;
    const activationLink = `${backendUrl}/auth/activate-account?token=${encodeURIComponent(invitationToken)}`;

    try {
      const result = await this.brevoClient.transactionalEmails.sendTransacEmail({
        htmlContent: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Invitación al equipo</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h1 style="color: #2c3e50; margin-bottom: 20px;">¡Bienvenido al equipo!</h1>
              <p style="font-size: 16px; margin-bottom: 15px;">
                Has sido invitado a unirte al equipo de <strong>${garageName}</strong>.
              </p>
              <p style="font-size: 16px; margin-bottom: 25px;">
                Para activar tu cuenta y establecer tu contraseña, haz clic en el siguiente botón:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${activationLink}" 
                   style="background-color: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  Activar mi cuenta
                </a>
              </div>
              <p style="font-size: 14px; color: #7f8c8d; margin-top: 30px;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="font-size: 12px; color: #95a5a6; word-break: break-all;">
                ${activationLink}
              </p>
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              <p style="font-size: 12px; color: #95a5a6; text-align: center;">
                Este enlace expirará en 7 días.
              </p>
            </div>
          </body>
        </html>
      `,
        sender: {
          email: this.fromEmail,
          name: `${garageName} - ${this.fromName}`,
        },
        subject: `Invitación al equipo de ${garageName}`,
        to: [{ email: recipientEmail }],
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error('=== ERROR ENVIANDO INVITACIÓN ===');
      console.error('Error completo:', error);
      console.error('=== FIN ERROR ===');

      return { success: false };
    }
  }
}
