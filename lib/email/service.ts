/**
 * Email Service
 *
 * Integrated with Resend for reliable email delivery
 */

import { Resend } from 'resend';

const IS_DEV = process.env.NODE_ENV === 'development';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Initialize Resend client
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Default sender email - using verified domain
const DEFAULT_FROM_EMAIL = 'CateringHub <noreply@cateringhubph.com>';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  // Log email details in development
  if (IS_DEV) {
    console.log('📧 Sending email via Resend:');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('From:', DEFAULT_FROM_EMAIL);
    console.log('API Key configured:', !!RESEND_API_KEY);
    console.log('---');
  }

  // Check if Resend is configured
  if (!resend) {
    const errorMsg = 'RESEND_API_KEY is not configured. Email cannot be sent.';
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }

  try {
    console.log('🔄 Calling Resend API...');

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log('📬 Resend API response received');
    console.log('Data:', data);
    console.log('Error:', error);

    if (error) {
      console.error('❌ Resend error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('✅ Email sent successfully! ID:', data?.id);
  } catch (error) {
    console.error('❌ Email sending failed with exception:', error);
    throw error;
  }
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

  // For local development testing
  const localhostUrl = `http://localhost:3000/invitations/accept?token=${token}`;
  const isLocalDev = !process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL.includes('localhost');

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

          ${isLocalDev ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-size: 13px; color: #856404; font-weight: 600;">
              🔧 Development Testing Only
            </p>
            <p style="margin: 0 0 15px 0; font-size: 12px; color: #856404;">
              Since the app is not deployed yet, use this localhost link for testing:
            </p>
            <div style="text-align: center;">
              <a href="${localhostUrl}"
                 style="background-color: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 14px;">
                Accept Invitation (Local Dev)
              </a>
            </div>
          </div>
          ` : ''}

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

/**
 * Send welcome email for admin-created team members
 *
 * Informs the user they've been added to the team and can log in using
 * Google OAuth or email/password (they can set up a password themselves).
 *
 * @param params - Email parameters
 */
export async function sendWelcomeEmail(params: {
  to: string;
  fullName: string;
  providerName: string;
  role: string;
  adminName: string;
}): Promise<void> {
  const { to, fullName, providerName, role, adminName } = params;
  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login`;
  const isLocalDev = loginUrl.includes('localhost');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${providerName}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin-top: 0;">Welcome to ${providerName}!</h1>

          <p style="font-size: 16px; margin-bottom: 20px;">
            Hi ${fullName},
          </p>

          <p style="font-size: 16px; margin-bottom: 20px;">
            Great news! ${adminName} has added you to <strong>${providerName}</strong> as a <strong>${role}</strong>.
          </p>

          <div style="background-color: #fff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              <strong>Your role:</strong> ${role}
            </p>
          </div>

          <p style="font-size: 16px; margin-bottom: 20px;">
            You can log in immediately using:
          </p>

          <ul style="font-size: 15px; margin-bottom: 15px; line-height: 1.8;">
            <li><strong>Google Sign-In</strong> - Quick and secure (recommended)</li>
          </ul>

          <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
            Want to use email & password instead? Click "Forgot password" on the login page to set up your password first.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}"
               style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Log in to ${providerName}
            </a>
          </div>

          ${isLocalDev ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 5px 0; font-size: 13px; color: #856404; font-weight: 600;">
              🔧 Development Testing
            </p>
            <p style="margin: 0; font-size: 12px; color: #856404;">
              This link points to localhost since the app is not deployed yet. Make sure your dev server is running on port 3000.
            </p>
          </div>
          ` : ''}

          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            <strong>Need help?</strong> If you have any questions about accessing your account, please contact ${adminName}.
          </p>

          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="font-size: 12px; color: #666; word-break: break-all; background-color: #f1f1f1; padding: 10px; border-radius: 4px;">
            ${loginUrl}
          </p>
        </div>

        <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
          <p>This account was created by ${adminName} from CateringHub.</p>
          <p>If you believe this was sent in error, please contact ${adminName}.</p>
        </div>
      </body>
    </html>
  `.trim();

  const text = `
Welcome to ${providerName}!

Hi ${fullName},

Great news! ${adminName} has added you to ${providerName} as a ${role}.

Your role: ${role}

You can log in immediately using:
- Google Sign-In - Quick and secure (recommended)

Want to use email & password instead? Click "Forgot password" on the login page to set up your password first.

Log in here: ${loginUrl}

Need help? If you have any questions about accessing your account, please contact ${adminName}.

---
This account was created by ${adminName} from CateringHub.
If you believe this was sent in error, please contact ${adminName}.
  `.trim();

  await sendEmail({
    to,
    subject: `Welcome to ${providerName}!`,
    html,
    text,
  });
}