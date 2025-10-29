// Tencent SES email service using official SDK
import { ses } from 'tencentcloud-sdk-nodejs';

export interface SubscriptionEmailData {
  email: string;
  password: string;
  subscriptionDate: string;
  expiryDate: string;
  paymentReference: string;
}

export interface PromoCodeEmailData {
  email: string;
  promoCode: string;
  uses: number;
  reference: string;
}

export async function sendPromoCodeEmail(data: PromoCodeEmailData): Promise<boolean> {
  try {
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;
    const region = process.env.TENCENT_SES_REGION || 'ap-singapore';
    const sender = process.env.TENCENT_SES_SENDER || 'data@soipattaya.com';

    if (!secretId || !secretKey) {
      console.error('❌ Tencent SES credentials not configured');
      return false;
    }

    // Initialize Tencent SES client
    const client = new ses.v20201002.Client({
      credential: {
        secretId: secretId,
        secretKey: secretKey,
      },
      region: region,
      profile: {
        httpProfile: {
          endpoint: 'ses.tencentcloudapi.com',
        },
      },
    });

    // Using Tencent SES template system

    // Create email request using template
    const request = {
      FromEmailAddress: sender,
      Destination: [data.email],
      Subject: '🎟️ Promo Code Purchase Confirmed - Your Code is Ready!',
      Template: {
        TemplateID: parseInt(process.env.TENCENT_SES_TEMPLATE_ID_PROMO || '66912'),
        TemplateData: JSON.stringify({
          email: data.email,
          promoCode: data.promoCode,
          uses: data.uses,
          reference: data.reference,
          purchaseDate: new Date().toLocaleDateString()
        })
      }
    };

    console.log('🔐 Sending promo code email via Tencent SES SDK...');
    console.log('📧 Sending to:', data.email);
    console.log('📤 From:', sender);

    // Send email using SDK
    const response = await client.SendEmail(request);

    console.log('📊 Response:', response);
    console.log(`✅ Promo code email sent to ${data.email}`);
    console.log(`📧 Please check spam folder if email not received within 5 minutes`);
    return true;

  } catch (error) {
    console.error('❌ Error sending promo code email:', error);
    return false;
  }
}

export async function sendSubscriptionEmail(data: SubscriptionEmailData): Promise<boolean> {
  try {
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;
    const region = process.env.TENCENT_SES_REGION || 'ap-singapore';
    const sender = process.env.TENCENT_SES_SENDER || 'data@soipattaya.com';

    if (!secretId || !secretKey) {
      console.error('❌ Tencent SES credentials not configured');
      return false;
    }

    // Initialize Tencent SES client
    const client = new ses.v20201002.Client({
      credential: {
        secretId: secretId,
        secretKey: secretKey,
      },
      region: region,
      profile: {
        httpProfile: {
          endpoint: 'ses.tencentcloudapi.com',
        },
      },
    });

    // Prepare email content
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Data Subscription Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; border: 2px solid #e1e5e9; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
            .info-row:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #555; }
            .value { color: #333; font-family: monospace; }
            .password { background: #f0f8ff; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 18px; font-weight: bold; color: #2c5aa0; text-align: center; margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎉 Data Subscription Confirmed!</h1>
            <p>Welcome to our premium data service</p>
        </div>
        <div class="content">
            <h2>Your Subscription Details</h2>
            <div class="info-box">
                <div class="info-row"><span class="label">📧 Email:</span><span class="value">${data.email}</span></div>
                <div class="info-row"><span class="label">🔑 Password:</span><div class="password">${data.password}</div></div>
                <div class="info-row"><span class="label">📅 Subscription Date:</span><span class="value">${data.subscriptionDate}</span></div>
                <div class="info-row"><span class="label">⏰ Expires:</span><span class="value">${data.expiryDate}</span></div>
                <div class="info-row"><span class="label">💳 Payment Reference:</span><span class="value">${data.paymentReference}</span></div>
            </div>
            <div class="info-box">
                <h3>🚀 What's Next?</h3>
                <ul>
                    <li>Use your email and password to access the data dashboard</li>
                    <li>Your subscription is valid for 365 days from today</li>
                    <li>You can access premium data and analytics</li>
                    <li>Contact support if you need any assistance</li>
                </ul>
            </div>
            <div class="info-box">
                <h3>🔐 Login Information</h3>
                <p><strong>Website:</strong> https://soipattaya.com/data or https://soibkk.com/data</p>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Password:</strong> <span class="password">${data.password}</span></p>
            </div>
        </div>
    </body>
    </html>`;

    const textContent = `
🎉 DATA SUBSCRIPTION CONFIRMED!

Welcome to our premium data service!

YOUR SUBSCRIPTION DETAILS:
============================
📧 Email: ${data.email}
🔑 Password: ${data.password}
📅 Subscription Date: ${data.subscriptionDate}
⏰ Expires: ${data.expiryDate}
💳 Payment Reference: ${data.paymentReference}

WHAT'S NEXT?
============
• Use your email and password to access the data dashboard
• Your subscription is valid for 365 days from today
• You can access premium data and analytics
• Contact support if you need any assistance

LOGIN INFORMATION:
=================
Website: https://soipattaya.com/data or https://soibkk.com/data
Email: ${data.email}
Password: ${data.password}

Thank you for subscribing to our data service!
This email was sent automatically. Please keep your login credentials safe.

📧 Note: If you don't see this email, please check your spam folder.`;

    // Create email request
    const request = {
      FromEmailAddress: sender,
      Destination: [data.email],
      Subject: '🎉 Data Subscription Confirmed - Welcome!',
      ReplyToAddresses: sender,
      Template: {
        TemplateID: parseInt(process.env.TENCENT_SES_TEMPLATE_ID_DATA || '66908'),
        TemplateData: JSON.stringify({
          email: data.email,
          password: data.password,
          subscriptionDate: data.subscriptionDate,
          expiryDate: data.expiryDate,
          paymentReference: data.paymentReference,
        })
      }
    };

    console.log('🔐 Sending email via Tencent SES SDK...');
    console.log('📧 Sending to:', data.email);
    console.log('📤 From:', sender);

    // Send email using SDK
    const response = await client.SendEmail(request);
    
    console.log('📊 Response:', response);
    console.log(`✅ Subscription email sent to ${data.email}`);
    console.log(`📧 Please check spam folder if email not received within 5 minutes`);
    return true;

  } catch (error) {
    console.error('❌ Error sending subscription email:', error);
    return false;
  }
}
