// Tencent SES email service using direct API calls
export interface SubscriptionEmailData {
  email: string;
  password: string;
  subscriptionDate: string;
  expiryDate: string;
  paymentReference: string;
}

async function generateSignature(method: string, uri: string, queryString: string, payload: string, timestamp: string): Promise<string> {
  const crypto = require('crypto');
  const secretKey = process.env.TENCENT_SECRET_KEY || '';
  
  const stringToSign = `${method}\n${uri}\n${queryString}\n${crypto.createHash('sha256').update(payload).digest('hex')}\n${timestamp}`;
  const signature = crypto.createHmac('sha256', secretKey).update(stringToSign).digest('hex');
  
  return signature;
}

export async function sendSubscriptionEmail(data: SubscriptionEmailData): Promise<boolean> {
  try {
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;
    const region = process.env.TENCENT_SES_REGION || 'ap-singapore';
    const sender = process.env.TENCENT_SES_SENDER || 'study@eigo.email';
    const templateId = process.env.TENCENT_SES_TEMPLATE_ID_EN || '66908';

    if (!secretId || !secretKey) {
      console.error('❌ Tencent SES credentials not configured');
      return false;
    }

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
                <p><strong>Website:</strong> https://soipattaya.com/data</p>
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
Website: https://soipattaya.com/data
Email: ${data.email}
Password: ${data.password}

Thank you for subscribing to our data service!
This email was sent automatically. Please keep your login credentials safe.`;

    // Use simple SMTP approach with fetch to Tencent SES
    const response = await fetch(`https://ses.${region}.tencentcloudapi.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `TC3-HMAC-SHA256 Credential=${secretId}/${new Date().toISOString().split('T')[0]}/${region}/ses/tc3_request, SignedHeaders=content-type;host, Signature=${await generateSignature('POST', '/', '', JSON.stringify({
          Source: sender,
          Destination: { ToAddresses: [data.email] },
          Message: {
            Subject: { Data: '🎉 Data Subscription Confirmed - Welcome!' },
            Body: {
              Html: { Data: htmlContent },
              Text: { Data: textContent }
            }
          }
        }), new Date().toISOString())}`,
        'Host': `ses.${region}.tencentcloudapi.com`,
        'X-TC-Action': 'SendEmail',
        'X-TC-Version': '2020-10-02',
        'X-TC-Region': region
      },
      body: JSON.stringify({
        Source: sender,
        Destination: { ToAddresses: [data.email] },
        Message: {
          Subject: { Data: '🎉 Data Subscription Confirmed - Welcome!' },
          Body: {
            Html: { Data: htmlContent },
            Text: { Data: textContent }
          }
        }
      })
    });

    if (response.ok) {
      console.log(`✅ Subscription email sent to ${data.email}`);
      return true;
    } else {
      console.error('❌ Failed to send email:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending subscription email:', error);
    return false;
  }
}
