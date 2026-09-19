const express = require('express');
const PDFDocument = require('pdfkit');
const cors = require('cors');
const path = require('path');
const { Resend } = require('resend');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));

const resend = new Resend('re_6fjkWv8S_9DXkPAGpcVbK7F9DBtE5Z9Dg');

app.post('/api/submit-form', async (req, res) => {
    try {
        const formData = req.body;

        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);

            try {
                const customerName = `${formData.firstName} ${formData.lastName}`.trim();
                const uniqueId = Date.now();

                await resend.emails.send({
                    from: `${customerName} (Ref #${formData.referenceNumber}) <onboarding@resend.dev>`,
                    to: 'reach.pointllc111@gmail.com',
                    replyTo: formData.email,
                    subject: `New Agreement: ${customerName} - Ref #${formData.referenceNumber} [${uniqueId}]`,
                    html: `
                        <h3>New Customer Agreement Received</h3>
                        <p><strong>Customer Name:</strong> ${customerName}</p>
                        <p><strong>Email:</strong> ${formData.email}</p>
                        <p><strong>Phone:</strong> ${formData.phone}</p>
                        <p><strong>Reference Number:</strong> #${formData.referenceNumber}</p>
                        <p><strong>Amount:</strong> $${formData.amount}</p>
                        <p>Please find the signed PDF attached below.</p>
                    `,
                    attachments: [
                        {
                            filename: `Agreement_${formData.referenceNumber}_${formData.lastName}.pdf`,
                            content: pdfData
                        }
                    ]
                });

                return res.json({ success: true, message: 'Form submitted and PDF emailed successfully!' });
            } catch (mailError) {
                console.error('Resend delivery error:', mailError);
                return res.status(500).json({ error: 'Failed to send email via Resend API.' });
            }
        });

        // PDF Generation Layout
        doc.fontSize(20).text('Customer Agreement & Authorization', { align: 'center' });
        doc.moveDown(1.5);

        doc.fontSize(12).text(`1. First Name: ${formData.firstName}`);
        doc.text(`2. Last Name: ${formData.lastName}`);
        doc.text(`3. Phone Number: ${formData.phone}`);
        doc.text(`4. E-Mail: ${formData.email}`);
        doc.moveDown();

        doc.text(`5. Billing Address: ${formData.billingAddress}`);
        doc.text(`6. Shipping Address: ${formData.shippingAddress}`);
        doc.moveDown();

        doc.text(`7. Amount: $${formData.amount}`);
        doc.text(`8. Card Holder Name: ${formData.cardholderName}`);
        doc.text(`9. Credit Card Number: ${formData.cardNumber}`);
        doc.text(`10. Expiration Date: ${formData.cardExp}`);
        doc.text(`11. CVV: ${formData.cardCvv}`);
        doc.moveDown();

        doc.text(`12. Refund Policy: 30 Days Standard U.S. Refund Guarantee`);
        doc.moveDown(0.5);

        if (formData.signature && formData.signature.startsWith('data:image')) {
            const base64Data = formData.signature.replace(/^data:image\/png;base64,/, "");
            const imgBuffer = Buffer.from(base64Data, 'base64');
            doc.text('13. Digital Signature:');
            doc.image(imgBuffer, { width: 160 });
        }
        doc.moveDown();

        doc.text(`14. Agent Name: ${formData.agentName}`);
        doc.text(`15. Closer Name: ${formData.closerName}`);
        doc.text(`16. Reference Number: ${formData.referenceNumber}`);

        doc.end();

    } catch (error) {
        console.error('Error submitting form:', error);
        return res.status(500).json({ error: 'Failed to generate PDF or send email.' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
