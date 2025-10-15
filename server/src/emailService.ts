import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config();

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Create email transporter
function createTransporter(): nodemailer.Transporter | null {
  const emailHost = process.env.EMAIL_HOST;
  const emailPort = process.env.EMAIL_PORT;
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailHost || !emailPort || !emailUser || !emailPass) {
    console.warn('Email configuration missing. Email sending disabled.');
    return null;
  }

  const config: EmailConfig = {
    host: emailHost,
    port: parseInt(emailPort, 10),
    secure: emailPort === '465', // true for 465, false for other ports
    auth: {
      user: emailUser,
      pass: emailPass
    }
  };

  return nodemailer.createTransport(config);
}

// Email templates
export const emailTemplates = {
  promoCode: (code: string, maxListings: number, siteDomain: string = 'soipattaya.com') => ({
    subject: `🎟️ Your Promo Code - ${code}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Promo Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .promo-code { background: #fff; border: 3px solid #4CAF50; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
          .code { font-size: 32px; font-weight: bold; color: #2E7D32; font-family: monospace; letter-spacing: 2px; }
          .details { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎟️ Your Promo Code is Ready!</h1>
            <p>Thank you for your payment. Your promo code has been generated.</p>
          </div>
          
          <div class="content">
            <div class="promo-code">
              <h2>Your Promo Code</h2>
              <div class="code">${code}</div>
              <p><strong>Valid for ${maxListings} listing${maxListings > 1 ? 's' : ''}</strong></p>
            </div>
            
            <div class="details">
              <h3>📋 How to Use Your Promo Code:</h3>
              <ol>
                <li>Go to <a href="https://${siteDomain}/create">${siteDomain}/create</a></li>
                <li>Fill out your property details</li>
                <li>In the "Promo Code" section, enter: <strong>${code}</strong></li>
                <li>Click "Pay with Promo" to create your listing for free!</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://${siteDomain}/create" class="button">Create Your Listing Now</a>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>⚠️ Important:</strong> This promo code can only be used once and is valid for ${maxListings} listing${maxListings > 1 ? 's' : ''}. 
              Make sure to use it before it expires!
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for choosing soiPattaya!</p>
            <p>If you have any questions, please contact us.</p>
            <p><small>This is an automated message. Please do not reply to this email.</small></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Your Promo Code: ${code}

Valid for ${maxListings} listing${maxListings > 1 ? 's' : ''}

How to use:
1. Go to https://${siteDomain}/create
2. Fill out your property details
3. In the "Promo Code" section, enter: ${code}
4. Click "Pay with Promo" to create your listing for free!

Important: This promo code can only be used once and is valid for ${maxListings} listing${maxListings > 1 ? 's' : ''}.

Thank you for choosing soiPattaya!
    `
  })
};

// Send email function
export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.warn('Email transporter not configured. Email not sent.');
    return false;
  }

  try {
    const mailOptions = {
      from: `"soiPattaya" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Send promo code email
export async function sendPromoCodeEmail(
  to: string, 
  code: string, 
  maxListings: number, 
  siteDomain: string = 'soipattaya.com'
): Promise<boolean> {
  const template = emailTemplates.promoCode(code, maxListings, siteDomain);
  return await sendEmail(to, template.subject, template.html, template.text);
}

// Test email configuration
export async function testEmailConfiguration(): Promise<boolean> {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.error('Email configuration missing');
    return false;
  }

  try {
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration test failed:', error);
    return false;
  }
}
