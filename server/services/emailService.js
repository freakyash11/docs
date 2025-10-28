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
            service: 'gmail',
            auth: {
                user: "docsy.app@gmail.com",
                pass: process.env.GOOGLE_APP_PASSWORD
            }
        });
    }

    async loadTemplate(templateName) {
        const templatePath = join(__dirname, '../templates/email', `${templateName}.hbs`);
        const template = await fs.readFile(templatePath, 'utf-8');
        return handlebars.compile(template);
    }

    async sendEmail({ to, subject, template, context }) {
        try {
            // Load and compile template
            const compiledTemplate = await this.loadTemplate(template);
            const html = compiledTemplate(context);

            // Send email
            const info = await this.transporter.sendMail({
                from: "docsy.app@gmail.com",
                to,
                subject,
                html
            });

            console.log('Email sent successfully:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    // Method to verify email configuration
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('Email service is ready');
            return true;
        } catch (error) {
            console.error('Email service verification failed:', error);
            throw error;
        }
    }
}

export const emailService = new EmailService();