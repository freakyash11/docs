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
      socketTimeout: 10000,
      logger: true,  // Detailed logs
      debug: true  
    });

    this.isVerified = false;
    this.verifyAsync();  // Async verification - don't block boot
  }

  async verifyAsync() {
    for (let attempt = 1; attempt <= 3; attempt++) {  // Retry 3 times
      try {
        await this.transporter.verify();
        this.isVerified = true;
        console.log('Email service verified successfully');
        break;  // Success - exit loop
      } catch (error) {
        console.error(`Email verification attempt ${attempt} failed:`, error.message);
        if (attempt === 3) {
          console.warn('Email service verification failed after retries - sends may fail');
        }
        await new Promise(resolve => setTimeout(resolve, 5000));  // Wait 5s before retry
      }
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