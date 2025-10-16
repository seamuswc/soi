# Tencent SES Email Template Setup

## Environment Variables Required

Add these to your `.env` file:

```env
TENCENT_SECRET_ID=IKIDA8qIWUCdokQpyvc3D7l9H9k6sSmsiIdi
TENCENT_SECRET_KEY=qPjncBUYMuCE0WlskNkwvgDYfZFhwzpR
TENCENT_SES_REGION=ap-singapore
TENCENT_SES_SENDER=study@eigo.email
TENCENT_SES_TEMPLATE_ID_EN=66908
```

## Template Setup in Tencent SES

### 1. Create Email Template

1. Go to Tencent Cloud Console → SES
2. Navigate to "Email Templates"
3. Click "Create Template"
4. Template Name: `subscription-confirmation`
5. Subject: `🎉 Data Subscription Confirmed - Welcome!`

### 2. HTML Template Content

Use the content from `email-templates/subscription-confirmation.html` but replace the template variables:

- `{{email}}` → `{{email}}`
- `{{password}}` → `{{password}}`
- `{{subscriptionDate}}` → `{{subscriptionDate}}`
- `{{expiryDate}}` → `{{expiryDate}}`
- `{{paymentReference}}` → `{{paymentReference}}`

### 3. Text Template Content

Use the content from `email-templates/subscription-confirmation.txt` with the same variable replacements.

### 4. Template Variables

The template expects these variables:
- `email`: User's email address
- `password`: Generated password
- `subscriptionDate`: Date of subscription
- `expiryDate`: Expiration date
- `paymentReference`: Solana payment reference

### 5. Template ID

Template ID is set to: **66908**
```env
TENCENT_SES_TEMPLATE_ID_EN=66908
```

## Testing

The email will be sent automatically when a user subscribes to the data service. The email includes:

- ✅ User's email and password
- ✅ Subscription date and expiry
- ✅ Payment reference
- ✅ Login instructions
- ✅ Professional HTML formatting

## Template Variables Mapping

| Variable | Description | Example |
|----------|-------------|---------|
| `{{email}}` | User's email | user@example.com |
| `{{password}}` | Generated password | abc123xyz |
| `{{subscriptionDate}}` | Subscription date | 10/16/2025 |
| `{{expiryDate}}` | Expiry date | 10/16/2026 |
| `{{paymentReference}}` | Solana payment ref | 5J7K8L9M... |

## Notes

- The email service is non-blocking (won't fail user creation if email fails)
- Templates support both HTML and text versions
- All template variables are automatically populated from user data
- Email is sent immediately after successful user registration
