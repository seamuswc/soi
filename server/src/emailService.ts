import { SesClient, SendEmailRequest } from 'tencentcloud-sdk-nodejs';

const sesClient = new SesClient({
  credential: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
  },
  region: process.env.TENCENT_SES_REGION || 'ap-singapore',
  profile: {
    httpProfile: {
      endpoint: 'ses.tencentcloudapi.com',
    },
  },
});

export interface SubscriptionEmailData {
  email: string;
  password: string;
  subscriptionDate: string;
  expiryDate: string;
  paymentReference: string;
}

export async function sendSubscriptionEmail(data: SubscriptionEmailData): Promise<boolean> {
  try {
    const request: SendEmailRequest = {
      Source: process.env.TENCENT_SES_SENDER || 'study@eigo.email',
      Destination: {
        ToAddresses: [data.email],
      },
      Template: {
        TemplateName: 'subscription-confirmation',
        TemplateData: JSON.stringify({
          email: data.email,
          password: data.password,
          subscriptionDate: data.subscriptionDate,
          expiryDate: data.expiryDate,
          paymentReference: data.paymentReference,
        }),
      },
    };

    await sesClient.SendEmail(request);
    console.log(`Subscription email sent to ${data.email}`);
    return true;
  } catch (error) {
    console.error('Error sending subscription email:', error);
    return false;
  }
}

// Alternative method using template ID (if using Tencent SES templates)
export async function sendSubscriptionEmailWithTemplate(data: SubscriptionEmailData): Promise<boolean> {
  try {
    const request: SendEmailRequest = {
      Source: process.env.TENCENT_SES_SENDER || 'study@eigo.email',
      Destination: {
        ToAddresses: [data.email],
      },
      Template: {
        TemplateName: 'subscription-confirmation',
        TemplateData: JSON.stringify({
          email: data.email,
          password: data.password,
          subscriptionDate: data.subscriptionDate,
          expiryDate: data.expiryDate,
          paymentReference: data.paymentReference,
        }),
      },
    };

    await sesClient.SendEmail(request);
    console.log(`Subscription email sent to ${data.email}`);
    return true;
  } catch (error) {
    console.error('Error sending subscription email:', error);
    return false;
  }
}
