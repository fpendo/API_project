"""
Email service - supports both SMTP and Mailgun
"""
import os
from pathlib import Path
from typing import Optional
import requests
from jinja2 import Environment, FileSystemLoader

from app.config import settings

# Setup Jinja2 for email templates
template_dir = Path(settings.TEMPLATE_DIR) / "emails"
template_dir.mkdir(parents=True, exist_ok=True)

# Create default email template if it doesn't exist
default_template = template_dir / "welcome_email.html"
if not default_template.exists():
    default_template.write_text("""
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #00d4aa, #0ea5e9); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; }
        .content { background: #f9fafb; padding: 30px; }
        .button { display: inline-block; background: #00d4aa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { background: #1a2234; color: #94a3b8; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; }
        .info-box { background: white; border-left: 4px solid #00d4aa; padding: 15px; margin: 20px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to ET Analytics</h1>
        </div>
        <div class="content">
            <p>Dear {{ company_name }},</p>
            
            <p>Thank you for your application to ET Analytics. We're excited to work with you!</p>
            
            <div class="info-box">
                <strong>Application ID:</strong> {{ application_id }}<br>
                <strong>Status:</strong> Contract Sent
            </div>
            
            <p>Your contract has been generated and is attached to this email. Please review, sign, and return it to us.</p>
            
            <p><strong>Next Steps:</strong></p>
            <ol>
                <li>Review and sign the attached Service Agreement</li>
                <li>Upload your company's Articles of Association</li>
                <li>Complete the disclosure permission letter (template provided)</li>
                <li>Submit payment details</li>
            </ol>
            
            <p>You can track your application status at any time:</p>
            <p style="text-align: center;">
                <a href="{{ app_status_url }}" class="button">Track Application Status</a>
            </p>
            
            <p>If you have any questions, please don't hesitate to contact us at <a href="mailto:{{ support_email }}">{{ support_email }}</a>.</p>
            
            <p>Best regards,<br>
            <strong>The ET Analytics Team</strong></p>
        </div>
        <div class="footer">
            <p>&copy; 2026 ETAnalytics Ltd. All rights reserved.</p>
            <p>Dublin, Ireland</p>
        </div>
    </div>
</body>
</html>
""")

env = Environment(loader=FileSystemLoader(template_dir))


async def send_contract_with_welcome_email(
    to_email: str,
    contact_name: str,
    company_name: str,
    registration_number: str,
    country: str,
    contact_phone: str,
    selected_plan: str,
    application_id: str,
    access_token: str,
    num_etfs: Optional[int] = None
) -> dict:
    """
    Generate contract and send welcome email with contract attachment.
    Uses Mailgun API or SMTP depending on configuration.
    """
    from app.services.contract_generator import generate_contract_document
    
    result = {
        'success': False,
        'contract_path': None,
        'email_sent': False,
        'message': ''
    }
    
    try:
        # Generate contract
        contract_path = await generate_contract_document(
            application_id=application_id,
            company_name=company_name,
            registration_number=registration_number,
            country=country,
            contact_phone=contact_phone,
            selected_plan=selected_plan,
            num_etfs=num_etfs or 10
        )
        
        result['contract_path'] = str(contract_path)
        result['success'] = True
        print(f"✅ Contract generated: {contract_path}")
        
        # Send email
        email_sent = await send_welcome_email(
            to_email=to_email,
            company_name=company_name,
            application_id=application_id,
            access_token=access_token,
            contract_attachment_path=contract_path
        )
        
        result['email_sent'] = email_sent
        result['message'] = 'Contract generated and welcome email sent successfully' if email_sent else 'Contract generated but email failed'
        
    except Exception as e:
        print(f"❌ Error in send_contract_with_welcome_email: {e}")
        result['message'] = str(e)
    
    return result


async def send_welcome_email(
    to_email: str,
    company_name: str,
    application_id: int,
    access_token: str,
    contract_attachment_path: Optional[Path] = None
) -> bool:
    """
    Send welcome email using Mailgun API or SMTP fallback
    """
    subject = f"Welcome to ET Analytics - Your Service Agreement | {company_name}"
    
    # Load HTML template
    template = env.get_template("welcome_email.html")
    
    # Render template
    html_content = template.render(
        company_name=company_name,
        application_id=application_id,
        access_token=access_token,
        app_status_url=f"https://www.etanalytics.co.uk/application-status?token={access_token}",
        support_email=settings.FROM_EMAIL,
        etanalytics_name=settings.FROM_NAME
    )
    
    # Try Mailgun first if configured
    if hasattr(settings, 'MAILGUN_API_KEY') and settings.MAILGUN_API_KEY and settings.MAILGUN_API_KEY != 'your-mailgun-api-key':
        return await send_via_mailgun(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            attachment_path=contract_attachment_path
        )
    
    # Fallback to SMTP
    return await send_via_smtp(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        attachment_path=contract_attachment_path
    )


async def send_via_mailgun(
    to_email: str,
    subject: str,
    html_content: str,
    attachment_path: Optional[Path] = None
) -> bool:
    """Send email via Mailgun API"""
    try:
        # Mailgun API endpoint
        domain = settings.MAILGUN_DOMAIN
        api_url = f"https://api.mailgun.net/v3/{domain}/messages"
        
        # Prepare data
        data = {
            "from": f"{settings.FROM_NAME} <{settings.FROM_EMAIL}>",
            "to": to_email,
            "subject": subject,
            "html": html_content
        }
        
        # Prepare files if attachment exists
        files = []
        if attachment_path and attachment_path.exists():
            files.append(
                ("attachment", (attachment_path.name, open(attachment_path, "rb"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
            )
        
        # Send request
        response = requests.post(
            api_url,
            auth=("api", settings.MAILGUN_API_KEY),
            data=data,
            files=files if files else None,
            timeout=30
        )
        
        # Close file handles
        for _, file_tuple in files:
            file_tuple[1].close()
        
        if response.status_code == 200:
            print(f"✅ Email sent via Mailgun to {to_email}")
            return True
        else:
            print(f"❌ Mailgun error {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Failed to send via Mailgun: {e}")
        return False


async def send_via_smtp(
    to_email: str,
    subject: str,
    html_content: str,
    attachment_path: Optional[Path] = None
) -> bool:
    """Send email via SMTP (fallback)"""
    import aiosmtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.application import MIMEApplication
    
    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{settings.FROM_NAME} <{settings.FROM_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        
        # Attach HTML
        msg.attach(MIMEText(html_content, "html"))
        
        # Attach file if provided
        if attachment_path and attachment_path.exists():
            with open(attachment_path, "rb") as f:
                attach = MIMEApplication(f.read(), _subtype="docx")
                attach.add_header(
                    "Content-Disposition",
                    "attachment",
                    filename=attachment_path.name,
                )
                msg.attach(attach)
        
        # Send via SMTP
        if settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD:
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                use_tls=True,
                timeout=30
            )
            print(f"✅ Email sent via SMTP to {to_email}")
            return True
        else:
            print("⚠️ SMTP not configured")
            return False
            
    except Exception as e:
        print(f"❌ Failed to send via SMTP: {e}")
        return False
