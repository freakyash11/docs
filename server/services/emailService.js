import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,  // STARTTLS (more reliable than 465 on Render)
      secure: false,  // false for port 587
      auth: {
        user: "docsy.app@gmail.com",
        pass: process.env.GOOGLE_APP_PASSWORD
      },
      pool: true,  // Reuse connections (reduces timeouts)
      maxConnections: 5,  // Limit concurrent
      maxMessages: 100,  // Per connection
      rateLimit: 10,  // Messages per second
      logger: true,  // Debug logs
      debug: true,
      connectionTimeout: 10000,  // 10s timeout
      greetingTimeout: 5000,
      socketTimeout: 10000  // Close idle sockets
    });

    this.isVerified = false;
    this.verifyAsync();  // Async verification - don't block boot
  }

  async verifyAsync() {
    try {
      await this.transporter.verify();
      this.isVerified = true;
      console.log('Email service verified successfully');
    } catch (error) {
      console.error('Email verification failed (non-blocking):', error.message);
      this.isVerified = false;  // Continue boot, retry on send
    }
  }

  async loadTemplate(templateName) {
    const templatePath = join(__dirname, '../templates/email', `${templateName}.hbs`);
    const template = await fs.readFile(templatePath, 'utf-8');
    return handlebars.compile(template);
  }

  async sendEmail({ to, subject, template, context }) {
    if (!this.isVerified) {
      console.warn('Email service not verified - attempting send anyway');
    }

    try {
      const compiledTemplate = await this.loadTemplate(template);
      const html = compiledTemplate(context);

      const mailOptions = {
        from: "docsy.app@gmail.com",
        to,
        subject,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error.message);
      throw error;
    }
  }
}

export const emailService = new EmailService();