import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Urticaria Tracker — UAS7',
        short_name: 'Urticaria Tracker',
        description: 'Rastreador semanal de urticária com pontuação UAS7 e registro visual.',
        start_url: '/',
        display: 'standalone',
        background_color: '#fff1f2',
        theme_color: '#991b1b',
        icons: [
            {
                src: '/logo.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/logo.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
        ],
    }
}