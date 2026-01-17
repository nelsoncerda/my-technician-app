import nodemailer from 'nodemailer';

// Configuration - use environment variables in production
const APP_URL = process.env.APP_URL || 'https://nelsoncerda.com';
const API_URL = process.env.API_URL || 'https://nelsoncerda.com';

// SMTP Configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || '"Santiago Tech RD" <no-reply@santiagotech.rd>';

// Flag to check if real SMTP is configured
const useRealSMTP = SMTP_HOST && SMTP_USER && SMTP_PASS;

// Create a transporter - uses real SMTP if configured, otherwise Ethereal for testing
const createTransporter = async () => {
    if (useRealSMTP) {
        // Production: Use real SMTP server
        console.log(`Using real SMTP: ${SMTP_HOST}:${SMTP_PORT}`);
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465, // true for 465, false for other ports
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });

        return { transporter, testAccount: null };
    } else {
        // Development: Use Ethereal Email (emails won't actually be sent)
        console.log('Using Ethereal Email (test mode - emails not actually sent)');
        const testAccount = await nodemailer.createTestAccount();

        const transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });

        return { transporter, testAccount };
    }
};

// Email template wrapper
const getEmailTemplate = (content: string, preheader: string = '') => `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Santiago Tech RD</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {font-family: Arial, sans-serif !important;}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <!-- Preheader text (hidden) -->
    <div style="display: none; max-height: 0; overflow: hidden;">
        ${preheader}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #16a085 0%, #1abc9c 100%); padding: 30px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                                Santiago Tech RD
                            </h1>
                            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                                Los mejores tecnicos del Cibao
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            ${content}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 40px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="margin: 0 0 10px; color: #6c757d; font-size: 12px;">
                                &copy; ${new Date().getFullYear()} Santiago Tech RD. Todos los derechos reservados.
                            </p>
                            <p style="margin: 0; color: #6c757d; font-size: 12px;">
                                Santiago de los Caballeros, Republica Dominicana
                            </p>
                            <p style="margin: 10px 0 0; color: #adb5bd; font-size: 11px;">
                                Si no solicitaste este correo, puedes ignorarlo de forma segura.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

// Generic send email function
interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export const sendEmail = async (options: SendEmailOptions) => {
    try {
        const { transporter, testAccount } = await createTransporter();

        const info = await transporter.sendMail({
            from: SMTP_FROM,
            to: options.to,
            subject: options.subject,
            text: options.text || '',
            html: options.html,
        });

        console.log('Email sent: %s', info.messageId);

        // Only show preview URL for Ethereal (test) emails
        if (testAccount) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log('Preview URL: %s', previewUrl);
            return previewUrl;
        }

        return info.messageId;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

export const sendVerificationEmail = async (email: string, token: string, userName?: string) => {
    try {
        const { transporter, testAccount } = await createTransporter();

        const verificationLink = `${API_URL}/api/auth/verify?token=${token}`;
        const greeting = userName ? `Hola ${userName},` : 'Hola,';

        const content = `
            <h2 style="margin: 0 0 20px; color: #333; font-size: 24px;">Verifica tu cuenta</h2>
            <p style="margin: 0 0 20px; color: #555; font-size: 16px; line-height: 1.6;">
                ${greeting}
            </p>
            <p style="margin: 0 0 25px; color: #555; font-size: 16px; line-height: 1.6;">
                Gracias por registrarte en <strong>Santiago Tech RD</strong>. Para completar tu registro y acceder a todos los servicios, por favor verifica tu direccion de correo electronico.
            </p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationLink}"
                   style="display: inline-block; background: linear-gradient(135deg, #16a085 0%, #1abc9c 100%); color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(22, 160, 133, 0.3);">
                    Verificar mi cuenta
                </a>
            </div>

            <p style="margin: 25px 0 0; color: #777; font-size: 14px; line-height: 1.6;">
                Si el boton no funciona, copia y pega el siguiente enlace en tu navegador:
            </p>
            <p style="margin: 10px 0 0; word-break: break-all;">
                <a href="${verificationLink}" style="color: #16a085; font-size: 13px;">${verificationLink}</a>
            </p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                <p style="margin: 0; color: #999; font-size: 13px;">
                    Este enlace expirara en 24 horas por seguridad.
                </p>
            </div>
        `;

        const info = await transporter.sendMail({
            from: SMTP_FROM,
            to: email,
            subject: 'Verifica tu cuenta - Santiago Tech RD',
            text: `${greeting} Gracias por registrarte en Santiago Tech RD. Por favor verifica tu cuenta haciendo clic en el siguiente enlace: ${verificationLink}`,
            html: getEmailTemplate(content, 'Verifica tu cuenta para acceder a Santiago Tech RD'),
        });

        console.log('Verification email sent to %s: %s', email, info.messageId);

        // Only show preview URL for Ethereal (test) emails
        if (testAccount) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log('Preview URL: %s', previewUrl);
            return previewUrl;
        }

        return info.messageId;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return null;
    }
};

export const sendWelcomeEmail = async (email: string, userName: string) => {
    try {
        const { transporter, testAccount } = await createTransporter();

        const content = `
            <h2 style="margin: 0 0 20px; color: #333; font-size: 24px;">Bienvenido a Santiago Tech RD!</h2>
            <p style="margin: 0 0 20px; color: #555; font-size: 16px; line-height: 1.6;">
                Hola ${userName},
            </p>
            <p style="margin: 0 0 20px; color: #555; font-size: 16px; line-height: 1.6;">
                Tu cuenta ha sido verificada exitosamente. Ahora puedes disfrutar de todos nuestros servicios:
            </p>

            <ul style="margin: 20px 0; padding-left: 20px; color: #555; font-size: 15px; line-height: 1.8;">
                <li>Buscar y contactar tecnicos verificados</li>
                <li>Reservar servicios en linea</li>
                <li>Acumular puntos con cada reserva</li>
                <li>Dejar resenas y calificaciones</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}"
                   style="display: inline-block; background: linear-gradient(135deg, #f39c12 0%, #f1c40f 100%); color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(243, 156, 18, 0.3);">
                    Explorar tecnicos
                </a>
            </div>

            <p style="margin: 25px 0 0; color: #777; font-size: 14px; line-height: 1.6;">
                Si tienes alguna pregunta, no dudes en contactarnos.
            </p>
        `;

        const info = await transporter.sendMail({
            from: SMTP_FROM,
            to: email,
            subject: 'Bienvenido a Santiago Tech RD!',
            text: `Hola ${userName}, bienvenido a Santiago Tech RD! Tu cuenta ha sido verificada. Visita ${APP_URL} para comenzar.`,
            html: getEmailTemplate(content, 'Tu cuenta ha sido verificada - Bienvenido a Santiago Tech RD'),
        });

        console.log('Welcome email sent to %s: %s', email, info.messageId);

        // Only show preview URL for Ethereal (test) emails
        if (testAccount) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log('Preview URL: %s', previewUrl);
            return previewUrl;
        }

        return info.messageId;
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return null;
    }
};
