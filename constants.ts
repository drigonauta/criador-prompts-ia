
export interface AIModel {
    id: string;
    name: string;
    type: 'text' | 'image' | 'video' | 'image-edit';
    description: string;
    url: string;
}

export const AI_MODELS: AIModel[] = [
    // Text Models
    {
        id: 'geral-texto',
        name: 'Geral / Padrão',
        type: 'text',
        description: 'Um prompt de texto bem estruturado que funciona na maioria das IAs.',
        url: 'https://gemini.google.com/'
    },
    {
        id: 'ChatGPT (GPT-4)',
        name: 'ChatGPT (GPT-4)',
        type: 'text',
        description: 'Otimizado para conversas complexas, raciocínio e geração de texto.',
        url: 'https://chat.openai.com/'
    },
    {
        id: 'Google Gemini',
        name: 'Google Gemini',
        type: 'text',
        description: 'Poderoso em tarefas multimodais e geração de texto criativo.',
        url: 'https://gemini.google.com/'
    },
    // Image Models
    {
        id: 'geral-imagem',
        name: 'Geral / Padrão',
        type: 'image',
        description: 'Um prompt de imagem bem estruturado que funciona na maioria das IAs.',
        url: 'https://www.bing.com/images/create'
    },
    {
        id: 'midjourney',
        name: 'Midjourney',
        type: 'image',
        description: 'Focado em imagens artísticas e estilizadas de alta qualidade.',
        url: 'https://www.midjourney.com/imagine'
    },
    {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        type: 'image',
        description: 'Excelente para criar imagens criativas e seguir instruções de texto com precisão.',
        url: 'https://chat.openai.com/'
    },
    {
        id: 'google-imagen-3',
        name: 'Google Imagen 3',
        type: 'image',
        description: 'Geração de imagens fotorrealistas e de alta qualidade da Google.',
        url: 'https://aistudio.google.com/app/imagefx'
    },
    {
        id: 'nano-banana',
        name: 'Nano Banana',
        type: 'image',
        description: 'IA especializada em geração de imagens criativas e detalhadas.',
        url: 'https://nanobanana.com/' // Placeholder URL
    },
    {
        id: 'stable-diffusion',
        name: 'Stable Diffusion',
        type: 'image',
        description: 'Altamente personalizável, ideal para quem gosta de experimentar com parâmetros.',
        url: 'https://dreamstudio.ai/'
    },
    // Image Edit Models
    {
        id: 'nano-banana-edit',
        name: 'Nano Banana (Editar)',
        type: 'image-edit',
        description: 'Edita uma imagem existente com base em um prompt de texto.',
        url: 'https://nanobanana.com/' // Placeholder URL
    },
    {
        id: 'adobe-firefly',
        name: 'Adobe Firefly (Generative Fill)',
        type: 'image-edit',
        description: 'Poderosa ferramenta de edição e preenchimento generativo.',
        url: 'https://firefly.adobe.com/'
    },
    {
        id: 'canva-magic-edit',
        name: 'Canva (Magic Edit)',
        type: 'image-edit',
        description: 'Edição de imagem intuitiva e integrada ao ecossistema Canva.',
        url: 'https://www.canva.com/magic-edit/'
    },
    {
        id: 'playground-ai',
        name: 'Playground AI (Inpainting)',
        type: 'image-edit',
        description: 'Plataforma versátil com boas capacidades de edição.',
        url: 'https://playground.com/'
    },
    {
        id: 'fotor-ai-editor',
        name: 'Fotor (AI Image Editor)',
        type: 'image-edit',
        description: 'Editor de fotos online com várias ferramentas de IA.',
        url: 'https://www.fotor.com/features/ai-image-editor'
    },
    // Video Models
    {
        id: 'Google VEO',
        name: 'Google VEO',
        type: 'video',
        description: 'Gera vídeos de alta qualidade de 8 segundos com compreensão cinematográfica.',
        url: 'https://deepmind.google/technologies/veo/'
    },
    {
        id: 'Flow VEO',
        name: 'Flow VEO',
        type: 'video',
        description: 'Especializado em sequências de vídeo fluidas e contínuas de até 24s.',
        url: 'https://deepmind.google/technologies/veo/'
    },
    {
        id: 'Sora (OpenAI)',
        name: 'Sora (OpenAI)',
        type: 'video',
        description: 'Conhecido por vídeos mais longos e realistas com narrativas complexas.',
        url: 'https://openai.com/sora'
    },
    {
        id: 'Runway Gen-2',
        name: 'Runway Gen-2',
        type: 'video',
        description: 'Plataforma versátil para gerar e editar vídeos com IA.',
        url: 'https://runwayml.com/'
    },
    {
        id: 'Pika',
        name: 'Pika',
        type: 'video',
        description: 'Focado em vídeos curtos e expressivos com um toque artístico.',
        url: 'https://pika.art/'
    },
    {
        id: 'Stable Video Diffusion',
        name: 'Stable Video Diffusion',
        type: 'video',
        description: 'Modelo de código aberto para gerar vídeos curtos a partir de texto ou imagens.',
        url: 'https://stability.ai/stable-video'
    }
];

export const IDEA_SUGGESTIONS: string[] = [
    'Futurista', 'Mágico', 'Minimalista', 'Cyberpunk', 'Vintage', 'Sonho', 'Aventura', 'Misterioso', 'Cômico', 'Épico', 'Subaquático', 'Espacial', 'Natureza', 'Urbano', 'Abstrato', 'Fantasia', 'Gótico', 'Solarpunk', 'Retrô', 'Surreal'
];

export const DIALOGUE_LANGUAGES = [
    { id: 'sem-dialogo', name: 'Sem Diálogo / Narração' },
    { id: 'pt-br', name: 'Português (Brasil)' },
    { id: 'en-us', name: 'Inglês (EUA)' },
    { id: 'es-es', name: 'Espanhol' },
    { id: 'fr-fr', name: 'Francês' },
    { id: 'de-de', name: 'Alemão' },
];

export const SOCIAL_MEDIA_PLATFORMS = [
    { id: 'tiktok', name: 'TikTok', url: 'https://www.tiktok.com/' },
    { id: 'instagram-reels', name: 'Instagram Reels', url: 'https://www.instagram.com/' },
    { id: 'youtube-shorts', name: 'YouTube Shorts', url: 'https://www.youtube.com/shorts/' },
    { id: 'x-twitter', name: 'X (Twitter)', url: 'https://x.com/' },
    { id: 'facebook-reels', name: 'Facebook Reels', url: 'https://www.facebook.com/' },
];

export const VIDEO_DURATIONS = [8, 16, 24, 32, 40, 48, 56];

export const ANALYSIS_GOALS = [
    { id: 'views', name: 'Aumentar Visualizações' },
    { id: 'interaction', name: 'Aumentar Engajamento' },
    { id: 'followers', name: 'Conseguir mais Seguidores' },
];
