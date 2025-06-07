/**
 * Returns the FastAPI base URL for server-side code.
 * – In Docker containers:   FASTAPI_URL=http://core:5328
 * – In local dev / browser: NEXT_PUBLIC_FASTAPI_URL=http://localhost:5328
 */
export function getFastApiUrl(): string {
    // In production, always use the core service
    if (process.env.NODE_ENV === 'production') {
        return 'http://core:5328';
    }

    // Development fallbacks
    return (
        process.env.FASTAPI_URL?.replace(/\/$/, '') ||
        process.env.NEXT_PUBLIC_FASTAPI_URL?.replace(/\/$/, '') ||
        'http://localhost:5328'
    );
}