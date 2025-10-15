/**
 * Email Service
 * 
 * TODO: Integrate with email provider (Resend, SendGrid, AWS SES)
 * For now, this logs emails to console in development
 */

const IS_DEV = process.env.NODE_ENV === 'development';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email
 * TODO: Replace with actual email service integration
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  if (IS_DEV) {
    console.log('📧 Email would be sent:');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('HTML:', options.html);
    console.log('Text:', options.text || '(no text version)');
    console.log('---');
  }

  // TODO: Integrate with email provider
  // Example with Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'CateringHub <noreply@cateringhub.com>',
  //   to: options.to,
  //   subject: options.subject,
  //   html: options.html,
  //   text: options.text,
  // });

  // For now, simulate successful send
  return Promise.resolve();
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(
  email: string,
  providerName: string,
  role: string,
  inviterName: string,
  token: string
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const acceptUrl = `${baseUrl}/invitations/accept?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team Invitation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin-top: 0;">You've been invited to join ${providerName}</h1>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            ${inviterName} has invited you to join <strong>${providerName}</strong> as a <strong>${role}</strong>.
          </p>

          <div style="background-color: white; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              <strong>Role:</strong> ${role}<br>
              <strong>Provider:</strong> ${providerName}
            </p>
          </div>

          <p style="margin-bottom: 30px;">
            Click the button below to accept this invitation. This link will expire in 48 hours.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${acceptUrl}" 
               style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Accept Invitation
            </a>
          </div>

          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Or copy and paste this link into your browser:<br>
            <a href="${acceptUrl}" style="color: #2563eb; word-break: break-all;">${acceptUrl}</a>
          </p>
        </div>

        <div style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
          <p>This invitation was sent by ${inviterName} from CateringHub.</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
You've been invited to join ${providerName}

${inviterName} has invited you to join ${providerName} as a ${role}.

Role: ${role}
Provider: ${providerName}

Click the link below to accept this invitation (expires in 48 hours):
${acceptUrl}

If you didn't expect this invitation, you can safely ignore this email.

---
This invitation was sent by ${inviterName} from CateringHub.
  `.trim();

  await sendEmail({
    to: email,
    subject: `You've been invited to join ${providerName}`,
    html,
    text,
  });
}

