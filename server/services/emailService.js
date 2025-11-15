import sgMail from '@sendgrid/mail';
import handlebars from 'handlebars';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class EmailService {
  constructor() {
    console.log('SendGrid service initialized');
  }

  async loadTemplate(templateName) {
    const templatePath = join(__dirname, '../templates/email', `${templateName}.hbs`);
    const template = await fs.readFile(templatePath, 'utf-8');
    return handlebars.compile(template);
  }

  async sendEmail({ to, subject, template, context }) {
    try {
      const compiledTemplate = await this.loadTemplate(template);
      const html = compiledTemplate(context);

      const msg = {
        to,
        from: 'docsy.app@gmail.com',  
        subject,
        html
      };

      const response = await sgMail.send(msg);
      console.log('Email sent successfully:', response[0].statusCode);
      return { success: true, messageId: response[0].headers['x-message-id'] };
    } catch (error) {
      console.error('SendGrid error:', error.response ? error.response.body : error.message);
      return { success: false, error: error.message };
    }
  }
}

export const emailService = new EmailService();