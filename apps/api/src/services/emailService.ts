import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { logger } from '../utils/logger.js';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  fromName: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;
  private isInitialized = false;

  private loadConfig(): EmailConfig {
    const requiredVars = [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_SECURE',
      'SMTP_USER',
      'SMTP_PASS',
      'SMTP_FROM',
      'SMTP_FROM_NAME',
    ];

    const missing = requiredVars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      throw new Error(`Missing required SMTP environment variables: ${missing.join(', ')}`);
    }

    return {
      host: process.env.SMTP_HOST!,
      port: parseInt(process.env.SMTP_PORT!, 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
      from: process.env.SMTP_FROM!,
      fromName: process.env.SMTP_FROM_NAME!,
    };
  }

  initialize(): void {
    if (this.isInitialized) return;

    try {
      this.config = this.loadConfig();
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
      });
      this.isInitialized = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      throw error;
    }
  }

  getTransporter(): Transporter {
    if (!this.isInitialized || !this.transporter) {
      this.initialize();
    }
    return this.transporter!;
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      logger.info('SMTP connection verified successfully');
      return true;
    } catch (error) {
      logger.error('SMTP connection verification failed:', error);
      return false;
    }
  }

  private buildVerificationEmail(verificationLink: string, displayName: string): EmailTemplate {
    const subject = 'Verify your email address';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">CryptoShield AI</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #1f2937; margin-top: 0;">Verify your email address</h2>
            <p style="color: #4b5563; font-size: 16px;">Hi ${displayName},</p>
            <p style="color: #4b5563; font-size: 16px;">Thanks for signing up for CryptoShield AI. Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.escapeHtml(verificationLink)}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Verify Email Address</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #6b7280; font-size: 14px; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 6px;">${this.escapeHtml(verificationLink)}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px;">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
          </div>
        </body>
      </html>
    `;
    const text = `
      Verify your email address
      
      Hi ${displayName},
      
      Thanks for signing up for CryptoShield AI. Please verify your email address by clicking the link below:
      
      ${verificationLink}
      
      This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
    `;
    return { subject, html, text };
  }

  private buildPasswordResetEmail(resetLink: string, displayName: string): EmailTemplate {
    const subject = 'Reset your password';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">CryptoShield AI</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #1f2937; margin-top: 0;">Reset your password</h2>
            <p style="color: #4b5563; font-size: 16px;">Hi ${displayName},</p>
            <p style="color: #4b5563; font-size: 16px;">You requested to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.escapeHtml(resetLink)}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #6b7280; font-size: 14px; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 6px;">${this.escapeHtml(resetLink)}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
        </body>
      </html>
    `;
    const text = `
      Reset your password
      
      Hi ${displayName},
      
      You requested to reset your password. Click the link below to create a new password:
      
      ${resetLink}
      
      This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    `;
    return { subject, html, text };
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;');
  }

  async sendVerificationEmail(email: string, displayName: string, verificationToken: string): Promise<boolean> {
    try {
      if (!this.isInitialized) this.initialize();
      
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
      const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;
      const template = this.buildVerificationEmail(verificationLink, displayName);
      
      const mailOptions: SendMailOptions = {
        from: `"${this.config!.fromName}" <${this.config!.from}>`,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      };

      const result = await this.getTransporter().sendMail(mailOptions);
      logger.info(`Verification email sent to ${email}: ${result.messageId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send verification email to ${email}:`, error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, displayName: string, resetToken: string): Promise<boolean> {
    try {
      if (!this.isInitialized) this.initialize();
      
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
      const template = this.buildPasswordResetEmail(resetLink, displayName);
      
      const mailOptions: SendMailOptions = {
        from: `"${this.config!.fromName}" <${this.config!.from}>`,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      };

      const result = await this.getTransporter().sendMail(mailOptions);
      logger.info(`Password reset email sent to ${email}: ${result.messageId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send password reset email to ${email}:`, error);
      return false;
    }
  }
}

export const emailService = new EmailService();