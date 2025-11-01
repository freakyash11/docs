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
      port: 587,  // STARTTLS - works better on Render
      secure: false,  // false for 587
      auth: {
        user: "docsy.app@gmail.com",
        pass: process.env.GOOGLE_APP_PASSWORD
      },
      pool: true,  // Reuse connections
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 14,  // Gmail limit
      connectionTimeout: 60000,  // 60s
      greetingTimeout: 20000,  // 20s
      socketTimeout: 60000,  // 60s
      logger: true,
      debug: true
    });

    this.isVerified = false;
    this.verifyAsync();
  }

  async verifyAsync() {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.transporter.verify();
        this.isVerified = true;
        console.log('Email service verified');
        return;
      } catch (error) {
        console.error(`Verification attempt ${attempt} failed:`, error.message);
        if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 5000));  // 5s delay
      }
    }
    console.warn('Email verification failed after retries - sends may fail');
  }

  async loadTemplate(templateName) {
    const templatePath = join(__dirname, '../templates/email', `${templateName}.hbs`);
    const template = await fs.readFile(templatePath, 'utf-8');
    return handlebars.compile(template);
  }

  async sendEmail({ to, subject, template, context }) {
    for (let attempt = 1; attempt <= 3; attempt++) {
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
        console.error(`Email send attempt ${attempt} failed:`, error.message);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 5000));  // 5s delay
        } else {
          console.warn('Email send failed after retries');
          return { success: false, error: error.message };  // Return failure, don't throw
        }
      }
    }
  }
}

export const emailService = new EmailService();