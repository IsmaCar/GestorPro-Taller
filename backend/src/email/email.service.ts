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
    //Construir la activación
    const url = new URL('/activate-account', this.frontendUrl);
    url.searchParams.set('token', invitationToken);
    const activationLink = url.toString();

    try {
      //LLamar a BrevoClient
      const result = await this.brevoClient.transactionalEmails.sendTransacEmail({
        htmlContent: `
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #2c3e50;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9f9f9;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .button {
          display: inline-block;
          background-color: #3498db;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .button:hover {
          background-color: #2980b9;
        }
        .footer {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${garageName}</h1>
      </div>
      
      <div class="content">
        <h2>¡Hola!</h2>
        
        <p>Has sido invitado a unirte al equipo de <strong>${garageName}</strong>.</p>
        
        <p>
          Como nuevo miembro del equipo, tendrás acceso a nuestro sistema de gestión 
          para ayudar en las operaciones diarias del taller.
        </p>
        
        <p>Para activar tu cuenta y establecer tu contraseña, haz clic en el siguiente botón:</p>
        
        <div style="text-align: center;">
          <a href="${activationLink}" class="button">
            Activar mi cuenta
          </a>
        </div>
        
        <p>O copia y pega este enlace en tu navegador:</p>
        <p style="word-break: break-all; color: #666; font-size: 12px;">
          ${activationLink}
        </p>
        
        <div class="footer">
          <p><strong>Nota importante:</strong> Este enlace de activación expirará en 7 días.</p>
          <p>Si no solicitaste esta invitación, puedes ignorar este correo de forma segura.</p>
        </div>
      </div>
    </body>
  </html>
`,
        sender: {
          email: this.fromEmail,
          name: `${garageName} - ${this.fromName}`,
        },
        subject: `Invitación al equipo de ${garageName}`,
        to: [
          {
            email: recipientEmail,
          },
        ],
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error('Error enviando email de invitación:', error);
      return { success: false };
    }
  }
}
