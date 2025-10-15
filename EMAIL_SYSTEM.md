# 📧 Email System Documentation

## Overview

The soiPattaya system now includes a comprehensive email service that automatically sends promo codes to customers via email. This replaces the manual LINE-based promo code delivery with an automated email system.

## 🚀 Features

### ✅ **Automatic Email Sending**
- Promo codes are automatically sent via email when customers provide an email address
- Works for both admin-generated and payment-generated promo codes
- Beautiful HTML email templates with clear instructions

### ✅ **Email Configuration Testing**
- Admin dashboard includes email configuration testing
- Real-time validation of SMTP settings
- Clear error messages for configuration issues

### ✅ **Professional Email Templates**
- Responsive HTML design
- Clear promo code display
- Step-by-step usage instructions
- Branded with soiPattaya styling

## 🔧 Setup Instructions

### 1. **Configure Email Settings**

The system has been automatically configured with email settings in your `.env` file:

```bash
# Email Configuration
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
```

### 2. **Gmail Setup (Recommended)**

For Gmail, you need to:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password as `EMAIL_PASS`

### 3. **Alternative SMTP Providers**

You can use other email providers:

#### **SendGrid**
```bash
EMAIL_HOST="smtp.sendgrid.net"
EMAIL_PORT="587"
EMAIL_USER="apikey"
EMAIL_PASS="your-sendgrid-api-key"
```

#### **Mailgun**
```bash
EMAIL_HOST="smtp.mailgun.org"
EMAIL_PORT="587"
EMAIL_USER="your-mailgun-smtp-user"
EMAIL_PASS="your-mailgun-smtp-password"
```

#### **AWS SES**
```bash
EMAIL_HOST="email-smtp.us-east-1.amazonaws.com"
EMAIL_PORT="587"
EMAIL_USER="your-aws-smtp-username"
EMAIL_PASS="your-aws-smtp-password"
```

## 📋 API Endpoints

### **Test Email Configuration**
```http
GET /api/email/test
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "valid": true,
  "message": "Email configuration is working"
}
```

### **Send Promo Code Email**
```http
POST /api/email/send-promo
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "email": "customer@example.com",
  "code": "ABC12345",
  "max_listings": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Promo code email sent successfully"
}
```

## 🎨 Email Template

The system sends beautiful HTML emails with:

- **Header**: Gradient background with soiPattaya branding
- **Promo Code**: Large, clearly displayed code
- **Instructions**: Step-by-step usage guide
- **Call-to-Action**: Direct link to create listing
- **Important Notes**: Usage limitations and expiry info
- **Footer**: Professional branding and contact info

### **Email Content Includes:**
- Promo code prominently displayed
- Number of listings the code is valid for
- Direct link to create listing page
- Clear usage instructions
- Important warnings about single-use and expiry

## 🔄 **How It Works**

### **Customer Flow:**
1. Customer pays via Solana (1 USDC)
2. System verifies payment on blockchain
3. Customer selects number of listings (1-10)
4. Customer optionally enters email address
5. System generates promo code
6. **Email is automatically sent** (if email provided)
7. Customer receives beautiful email with promo code

### **Admin Flow:**
1. Admin generates promo code via dashboard
2. Admin sets listing count and email
3. **Email is automatically sent** (if email provided)
4. Admin can test email configuration anytime

## 🛠️ **Admin Dashboard Features**

### **Email Configuration Test**
- Test button to verify SMTP settings
- Real-time status display
- Clear error messages for troubleshooting

### **Enhanced Promo Code Generation**
- Email field for automatic delivery
- Email sending status in generated codes
- Visual indicators for email delivery

### **Promo Code Management**
- View all promo codes with email status
- See which codes were sent via email
- Track email delivery status

## 🔍 **Troubleshooting**

### **Email Not Sending**
1. Check email configuration in `.env`
2. Use the "Test Email Config" button in dashboard
3. Verify SMTP credentials are correct
4. Check firewall/network restrictions

### **Gmail Issues**
1. Ensure 2-Factor Authentication is enabled
2. Use App Password, not regular password
3. Check if "Less secure app access" is enabled (if needed)

### **Common Error Messages**
- `"Email configuration missing"` → Set EMAIL_* variables in .env
- `"Authentication failed"` → Check EMAIL_USER and EMAIL_PASS
- `"Connection timeout"` → Check EMAIL_HOST and EMAIL_PORT

## 📊 **Monitoring**

### **Server Logs**
The system logs all email activities:
- Successful email sends
- Failed email attempts
- Configuration errors

### **Dashboard Status**
- Email configuration test results
- Promo code generation with email status
- Visual indicators for email delivery

## 🚀 **Production Deployment**

### **Environment Variables**
Make sure these are set in production:
```bash
EMAIL_HOST="your-smtp-host"
EMAIL_PORT="587"
EMAIL_USER="your-smtp-username"
EMAIL_PASS="your-smtp-password"
SITE_DOMAIN="your-domain.com"
```

### **Security Considerations**
- Use environment variables for email credentials
- Consider using dedicated email service (SendGrid, Mailgun)
- Monitor email sending limits and quotas
- Set up email delivery monitoring

## 📈 **Benefits**

### **For Customers:**
- ✅ Automatic promo code delivery
- ✅ Professional email experience
- ✅ Clear usage instructions
- ✅ Direct links to create listings

### **For Admins:**
- ✅ No manual email sending required
- ✅ Automated workflow
- ✅ Professional customer communication
- ✅ Easy configuration testing

### **For Business:**
- ✅ Reduced manual work
- ✅ Better customer experience
- ✅ Professional brand image
- ✅ Automated customer onboarding

## 🎯 **Next Steps**

1. **Configure your email settings** in `.env`
2. **Test email configuration** via dashboard
3. **Generate a test promo code** with email
4. **Verify email delivery** works correctly
5. **Deploy to production** with proper SMTP settings

The email system is now fully integrated and ready to automatically deliver promo codes to your customers! 🎉
