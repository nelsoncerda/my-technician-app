import nodemailer from 'nodemailer';

// Create a transporter using Ethereal Email (for development)
// In production, use real SMTP credentials
const createTransporter = async () => {
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass, // generated ethereal password
        },
    });

    return { transporter, testAccount };
};

// Generic send email function
interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export const sendEmail = async (options: SendEmailOptions) => {
    try {
        const { transporter } = await createTransporter();

        const info = await transporter.sendMail({
            from: '"Santiago Tech RD" <no-reply@santiagotech.rd>',
            to: options.to,
            subject: options.subject,
            text: options.text || '',
            html: options.html,
        });

        console.log('Email sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

        return nodemailer.getTestMessageUrl(info);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

export const sendVerificationEmail = async (email: string, token: string) => {
    try {
        const { transporter } = await createTransporter();

        const verificationLink = `http://localhost:3001/api/auth/verify?token=${token}`;

        const info = await transporter.sendMail({
            from: '"Santiago Tech RD" <no-reply@santiagotech.rd>', // sender address
            to: email, // list of receivers
            subject: 'Verifica tu cuenta', // Subject line
            text: `Por favor verifica tu cuenta haciendo clic en el siguiente enlace: ${verificationLink}`, // plain text body
            html: `<b>Por favor verifica tu cuenta haciendo clic en el siguiente enlace:</b> <a href="${verificationLink}">${verificationLink}</a>`, // html body
        });

        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

        return nodemailer.getTestMessageUrl(info);
    } catch (error) {
        console.error('Error sending email:', error);
        return null;
    }
};
