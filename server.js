const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static frontend files from the 'public' folder
app.use(express.static('public'));

// Initialize Resend with your active API key
const resend = new Resend('re_PrJC4sEe_7UxrsyQTzy8L25reWwDyMSBh');

app.post('/api/submit-form', async (req, res) => {
    try {
        const formData = req.body;
        
        // 1. Send notification email to you
        const adminEmailPromise = resend.emails.send({
            from: 'onboarding@resend.dev',
            to: ['youssiefbahagy@gmail.com'],
            subject: `New Agreement Submission - Ref: ${formData.referenceNumber}`,
            html: `
                <h2>New Customer Agreement & Authorization</h2>
                <p><strong>Reference:</strong> ${formData.referenceNumber}</p>
                <p><strong>Agent:</strong> ${formData.agentName} | <strong>Closer:</strong> ${formData.closerName}</p>
                <hr>
                <p><strong>Customer:</strong> ${formData.firstName} ${formData.lastName}</p>
                <p><strong>Email:</strong> ${formData.email} | <strong>Phone:</strong> ${formData.phone}</p>
                <p><strong>Billing Address:</strong> ${formData.billingAddress}</p>
                <p><strong>Shipping Address:</strong> ${formData.shippingAddress}</p>
                <hr>
                <p><strong>Authorized Amount:</strong> $${formData.amount}</p>
                <p><strong>Cardholder Name:</strong> ${formData.cardholderName}</p>
                <p><strong>Digital Signature:</strong> <br><img src="${formData.signature}" alt="Signature" style="max-width:300px;border:1px solid #ccc;"/></p>
            `
        });

        // 2. Send confirmation copy to the client
        const clientEmailPromise = resend.emails.send({
            from: 'onboarding@resend.dev',
            to: [formData.email],
            subject: `Copy of Your Agreement & Terms - Ref: ${formData.referenceNumber}`,
            html: `
                <h2>Royals - Agreement Confirmation</h2>
                <p>Dear ${formData.firstName} ${formData.lastName},</p>
                <p>Thank you for submitting your agreement and authorization with Royals. Below is a copy of your submission details for your records:</p>
                <hr>
                <p><strong>Reference Number:</strong> ${formData.referenceNumber}</p>
                <p><strong>Authorized Amount:</strong> $${formData.amount}</p>
                <p><strong>Billing Address:</strong> ${formData.billingAddress}</p>
                <p><strong>Card Holder:</strong> ${formData.cardholderName}</p>
                <hr>
                <p><strong>Policy Reminder:</strong> All services and purchases are backed by our 30-day refundable policy. If you have any questions or require assistance, please reply directly to this communication or contact your assigned agent (${formData.agentName}).</p>
                <p>Best regards,<br><strong>Royals Secure Team</strong></p>
            `
        });

        await Promise.all([adminEmailPromise, clientEmailPromise]);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
