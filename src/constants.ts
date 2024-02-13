export const REDIS_SESSION_SETTING = {
    host: process.env.REDIS_SESSION_HOST || '',
    port: Number(process.env.REDIS_SESSION_PORT) || 0,
    password: process.env.REDIS_PASSWORD || '',
    db: 0
}

export const EXPRESS_CORS_SETTING = {
    origin: ['http://localhost:3000', `https://${process.env.FRONTEND_DOMAIN}`],
    credentials: true,
    allowedHeaders: [
        'ngrok-skip-browser-warning',
        'Content-Type'
    ]
}

export const SOCKET_CORS_SETTING = {
    origin: ['http://localhost:3000', `https://${process.env.FRONTEND_DOMAIN}`],
    credentials: true,
    allowedHeaders: [
        'ngrok-skip-browser-warning',
    ]
}