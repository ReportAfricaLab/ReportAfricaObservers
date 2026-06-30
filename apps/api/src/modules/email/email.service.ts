import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type EmailType = 'auth' | 'security' | 'billing' | 'admin';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  type: EmailType;
  replyTo?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly noReplyEmail: string;
  private readonly billingEmail: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get('RESEND_API_KEY', '');
    this.noReplyEmail = this.config.get('NOREPLY_EMAIL', 'noreply@reportafrica.africa');
    this.billingEmail = this.config.get('BILLING_EMAIL', 'billing@reportafrica.africa');
  }

  private getSender(type: EmailType): string {
    if (type === 'billing') return this.billingEmail;
    return this.noReplyEmail;
  }

  async send(params: SendEmailParams): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY not set — email not sent');
      return false;
    }

    const from = this.getSender(params.type);
    const replyTo = params.type === 'billing' ? (params.replyTo || this.billingEmail) : undefined;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: params.to,
          subject: params.subject,
          html: params.html,
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
      });

      const data = await res.json();
      if (data.id) {
        this.logger.log(`Email sent: ${params.subject} → ${params.to}`);
        return true;
      }
      this.logger.error(`Email failed: ${data.message || JSON.stringify(data)}`);
      return false;
    } catch (error) {
      this.logger.error('Resend API error', error);
      return false;
    }
  }

  // === TEMPLATES ===

  async sendVerificationEmail(to: string, token: string, displayName: string) {
    const verifyUrl = `https://reportafrica.africa/verify-email?token=${token}`;
    return this.send({
      to,
      subject: 'Verify your ReportAfrica email',
      type: 'auth',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#0F7B6C">Welcome to ReportAfrica, ${displayName}!</h2>
          <p>Please verify your email address to activate your account.</p>
          <a href="${verifyUrl}" style="display:inline-block;background:#0F7B6C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Verify Email</a>
          <p style="color:#666;font-size:12px">If you didn't create this account, please ignore this email.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const resetUrl = `https://reportafrica.africa/reset-password?token=${token}`;
    return this.send({
      to,
      subject: 'Reset your ReportAfrica password',
      type: 'security',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#0F7B6C">Password Reset</h2>
          <p>You requested a password reset. Click below to set a new password:</p>
          <a href="${resetUrl}" style="display:inline-block;background:#0F7B6C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Reset Password</a>
          <p style="color:#666;font-size:12px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
  }

  async sendObserverApproved(to: string, displayName: string, tier: string, country: string) {
    return this.send({
      to,
      subject: '✅ Observer Application Approved — ReportAfrica',
      type: 'billing',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#0F7B6C">Approved! 🎉</h2>
          <p>Hi ${displayName},</p>
          <p>Your election observer application has been approved.</p>
          <p><strong>Tier:</strong> ${tier}<br/><strong>Country:</strong> ${country}</p>
          <p>Complete your payment to activate 90-day access:</p>
          <a href="https://observers.reportafrica.africa" style="display:inline-block;background:#0F7B6C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Activate Access</a>
        </div>
      `,
    });
  }

  async sendObserverActivated(to: string, displayName: string, tier: string, days: number, expiresAt: string) {
    return this.send({
      to,
      subject: '🗳️ Observer Access Activated — ReportAfrica',
      type: 'billing',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#0F7B6C">Access Activated! 🗳️</h2>
          <p>Hi ${displayName},</p>
          <p>Your Election Observer dashboard is now active.</p>
          <p><strong>Tier:</strong> ${tier}<br/><strong>Duration:</strong> ${days} days<br/><strong>Expires:</strong> ${new Date(expiresAt).toLocaleDateString()}</p>
          <a href="https://observers.reportafrica.africa" style="display:inline-block;background:#0F7B6C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Open Dashboard</a>
        </div>
      `,
    });
  }

  async sendGovApproved(to: string, displayName: string, country: string, state?: string) {
    return this.send({
      to,
      subject: '🏛️ Government Agency Approved — ReportAfrica',
      type: 'billing',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#0F7B6C">Agency Approved! 🏛️</h2>
          <p>Hi ${displayName},</p>
          <p>Your government agency registration has been approved.</p>
          <p><strong>Jurisdiction:</strong> ${country}${state ? ` — ${state}` : ''}<br/><strong>Trial:</strong> 30 days free access</p>
          <a href="https://gov.reportafrica.africa" style="display:inline-block;background:#0F7B6C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Open Dashboard</a>
        </div>
      `,
    });
  }

  async sendGovAccessGranted(to: string, displayName: string, tier: string, days: number) {
    return this.send({
      to,
      subject: '🏛️ Government Dashboard Access Granted — ReportAfrica',
      type: 'billing',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#0F7B6C">Access Granted! 🏛️</h2>
          <p>Hi ${displayName},</p>
          <p>Your government dashboard subscription has been activated.</p>
          <p><strong>Plan:</strong> ${tier}<br/><strong>Duration:</strong> ${days} days</p>
          <a href="https://gov.reportafrica.africa" style="display:inline-block;background:#0F7B6C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Open Dashboard</a>
        </div>
      `,
    });
  }

  async sendSubscriptionExpiring(to: string, displayName: string, product: string, daysLeft: number) {
    return this.send({
      to,
      subject: `⚠️ Your ${product} subscription expires in ${daysLeft} days`,
      type: 'billing',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#F59E0B">Subscription Expiring ⚠️</h2>
          <p>Hi ${displayName},</p>
          <p>Your <strong>${product}</strong> subscription expires in <strong>${daysLeft} days</strong>.</p>
          <p>Renew now to maintain uninterrupted access.</p>
          <a href="https://reportafrica.africa" style="display:inline-block;background:#0F7B6C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Renew Now</a>
        </div>
      `,
    });
  }
}
