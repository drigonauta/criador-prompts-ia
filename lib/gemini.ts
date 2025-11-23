
import { GoogleGenAI, GenerateContentResponse, Type } from '@google/genai';
import { DIALOGUE_LANGUAGES, SOCIAL_MEDIA_PLATFORMS } from '../constants';

// The API key is automatically sourced from the environment variable `import.meta.env.VITE_API_KEY`.
// This setup assumes the key is pre-configured in the execution environment.
const API_KEY = import.meta.env.VITE_API_KEY;
if (!API_KEY) {
    // In a real application, you might want to handle this more gracefully,
    // but for this context, throwing an error is sufficient to indicate a misconfiguration.
    console.warn("VITE_API_KEY environment variable not set. Please ensure it is configured.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || '' });

/**
 * Converts a File object to a base64 encoded string suitable for the Gemini API.
 */
const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

/**
 * Generates a detailed prompt based on a user-provided topic, tailored for a specific AI.
 */
export const generatePromptFromText = async (topic: string, targetAI: string): Promise<string> => {
    try {
        const systemInstruction = `Você é um engenheiro de prompts especialista em IAs generativas. Sua tarefa é criar um prompt detalhado e eficaz para um usuário iniciante, especificamente para a IA chamada "${targetAI}".
        O usuário fornecerá um tópico simples. Você deve expandir esse tópico em um prompt rico e estruturado, otimizado para as melhores práticas e sintaxe da IA "${targetAI}".
        O prompt deve incluir, quando aplicável para "${targetAI}":
        1.  **Persona/Papel:** Defina o papel que a IA deve assumir.
        2.  **Tarefa:** Descreva claramente a tarefa.
        3.  **Contexto:** Forneça o contexto necessário.
        4.  **Formato de Saída:** Especifique o formato desejado.
        5.  **Tom e Estilo:** Indique o tom de voz.
        6.  **Parâmetros Específicos:** Se "${targetAI}" usa parâmetros especiais (como --ar para Midjourney), inclua-os.

        O prompt final deve ser apenas o prompt gerado, pronto para ser copiado e colado, sem nenhuma explicação ou texto adicional.`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { role: 'user', parts: [{ text: `Tópico do usuário: "${topic}"` }] },
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.8,
            }
        });

        return response.text || '';
    } catch (error) {
        console.error("Error generating prompt from text:", error);
        throw new Error(`Erro ao gerar prompt: ${(error as Error).message || error}`);
    }
};

/**
 * Generates a descriptive prompt based on an uploaded image and an optional instruction, tailored for a specific AI.
 */
export const generatePromptFromImage = async (imageFile: File | null, instruction: string, targetAI: string): Promise<string> => {
    try {
        let parts: any[] = [];
        let textPrompt = '';

        if (imageFile) {
            const imagePart = await fileToGenerativePart(imageFile);
            parts.push(imagePart);

            const instructionText = instruction.trim()
                ? `\n\n**Modificação Importante:** Além de descrever a imagem, o prompt final DEVE incorporar a seguinte instrução do usuário: "${instruction}". O prompt gerado deve ser uma fusão da descrição da imagem com esta modificação.`
                : `\n\nO objetivo é criar um prompt para recriar uma imagem semelhante.`;

            textPrompt = `Analise esta imagem em detalhes extremos. Crie um prompt descritivo e poderoso para a IA de geração de imagem chamada "${targetAI}".
            ${instructionText}
            
            O prompt final deve ser uma única string de texto, otimizada para a sintaxe e as palavras-chave que funcionam melhor com "${targetAI}". Descreva, usando o formato preferido por esta IA:
            - **Assunto principal:** O que ou quem está na imagem.
            - **Composição e Ângulo:** Disposição dos elementos e perspectiva da câmera.
            - **Estilo de arte:** (ex: fotorrealista, pintura a óleo, anime, arte digital, aquarela).
            - **Iluminação:** (ex: luz do dia suave, iluminação cinematográfica, neon, hora dourada).
            - **Paleta de cores:** Cores dominantes e clima.
            - **Detalhes específicos:** Texturas, reflexos, emoções.
            - **Parâmetros:** Inclua parâmetros específicos de "${targetAI}" se aplicável (ex: --ar 16:9, --v 6.0 para Midjourney).
            
            O resultado deve ser apenas o prompt, sem nenhuma explicação ou texto adicional.`;
        } else {
            // No image provided, generate based on instruction only
            if (!instruction.trim()) {
                throw new Error("Por favor, forneça uma descrição para a imagem.");
            }
            textPrompt = `Você é um engenheiro de prompts especialista em IAs de geração de imagem (como Midjourney, DALL-E, Stable Diffusion).
            Sua tarefa é criar um prompt visualmente rico e detalhado para a IA "${targetAI}", baseado APENAS na seguinte ideia do usuário: "${instruction}".
            
            O prompt deve ser otimizado para "${targetAI}" e descrever vividamente:
            - **Assunto:** O que deve aparecer na imagem.
            - **Estilo:** O estilo artístico (ex: foto realista, 3D, ilustração).
            - **Ambiente/Iluminação:** Detalhes da cena.
            - **Parâmetros:** Sintaxe específica da IA (se houver).

            O resultado deve ser APENAS o prompt final, pronto para copiar e colar.`;
        }

        parts.push({ text: textPrompt });

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { role: 'user', parts: parts },
        });

        return response.text || '';
    } catch (error) {
        console.error("Error generating prompt from image:", error);
        throw new Error(`Erro ao gerar prompt de imagem: ${(error as Error).message || error}`);
    }
};

export const generateImageEditPrompt = async (imageFile: File, instruction: string): Promise<string> => {
    try {
        const imagePart = await fileToGenerativePart(imageFile);
        const systemInstruction = `Você é um engenheiro de prompts especialista em IAs de edição de imagem (inpainting/outpainting) como Adobe Firefly e Playground AI.
        Sua tarefa é analisar a imagem base e a instrução simples do usuário para criar um prompt de texto detalhado e universal que outra IA possa usar para executar a edição.
        O prompt deve primeiro descrever os elementos essenciais da imagem original (assunto, estilo, iluminação) e depois declarar claramente a modificação solicitada.
        Exemplo de saída: "foto de um homem com óculos amarelos, iluminação de estúdio, adicione um chapéu de pirata preto na cabeça dele".
        O resultado deve ser apenas o prompt de texto, sem nenhuma explicação.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                role: 'user',
                parts: [
                    imagePart,
                    { text: `Instrução do usuário: "${instruction}"` }
                ]
            },
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            }
        });
        return response.text || '';
    } catch (error) {
        console.error("Error generating image edit prompt:", error);
        throw new Error(`Erro ao gerar prompt de edição: ${(error as Error).message || error}`);
    }
};

interface VideoPromptOptions {
    duration?: number;
    outputFormat?: 'normal' | 'json';
    dialogueLanguage?: string;
    influencerPrompt?: string;
    existingPrompts?: string;
    backgroundImageFile?: File;
    logoFile?: File;
    videoType?: 'normal' | 'commercial';
    onScreenText?: 'sim' | 'nao';
}

/**
 * Generates a cinematic prompt based on a user's video idea, tailored for a specific AI.
 */
export const generatePromptFromVideoIdea = async (idea: string, targetAI: string, options: VideoPromptOptions = {}): Promise<string> => {
    try {
        let systemInstruction: string;
        const { duration = 8, outputFormat = 'normal', dialogueLanguage = 'sem-dialogo', influencerPrompt, existingPrompts, backgroundImageFile, logoFile, videoType = 'normal', onScreenText = 'nao' } = options;

        const languageName = DIALOGUE_LANGUAGES.find(l => l.id === dialogueLanguage)?.name || dialogueLanguage;
        const languageInstruction = dialogueLanguage !== 'sem-dialogo'
            ? `A cena deve incluir diálogo ou narração no idioma: **${languageName}**. No prompt gerado, integre o texto falado de forma clara, por exemplo: '...enquanto uma narração em ${languageName} diz: "[texto aqui]"'.`
            : 'A cena é puramente visual, sem diálogos ou narração.';

        const influencerInstruction = influencerPrompt
            ? `O personagem principal da cena é um influenciador digital específico, definido pelo seguinte "Character Sheet":\n---\n${influencerPrompt}\n---\nGaranta que a descrição do personagem no prompt final seja consistente com esta ficha.`
            : 'O personagem principal pode ser criado livremente com base na ideia da cena.';

        const backgroundInstruction = backgroundImageFile
            ? "A imagem de cenário fornecida é a referência principal para o ambiente. Analise-a e use sua atmosfera, estilo, iluminação e elementos como base para o ambiente da cena."
            : "O cenário da cena pode ser criado livremente com base na ideia da cena.";

        const commercialInstruction = videoType === 'commercial' && logoFile
            ? `**BRIEFING DE COMERCIAL:** Esta é uma peça publicitária. A logomarca fornecida deve ser integrada de forma proeminente e fiel. Analise a logo em detalhe extremo (cores exatas, formas, tipografia) e descreva-a no prompt para que apareça de forma natural, mas clara, na cena (ex: em um outdoor, em um produto, em uma camiseta).`
            : videoType === 'commercial'
                ? `**BRIEFING DE COMERCIAL:** Esta é uma peça publicitária. O tone deve ser profissional e focado em destacar um produto ou serviço implícito na ideia do usuário.`
                : '';

        const onScreenTextInstruction = onScreenText === 'sim'
            ? 'Inclua também sugestões de texto na tela (on-screen text) que sejam curtos, dinâmicos e complementem a narração ou a ação, como é comum em vídeos para redes sociais.'
            : 'O vídeo deve ser puramente visual, sem nenhum texto na tela (on-screen text).';

        const segments = duration / 8;
        const isContinuation = existingPrompts && existingPrompts.trim() !== '';

        let lastSegmentNumber = 0;
        if (isContinuation) {
            const matches = existingPrompts.match(/(\d+)\./g);
            if (matches) {
                lastSegmentNumber = parseInt(matches[matches.length - 1].replace('.', ''), 10);
            }
        }

        if (targetAI === 'Flow VEO' && (duration > 8 || isContinuation)) {
            const formatInstruction = outputFormat === 'json'
                ? `O resultado DEVE ser um array JSON válido. Cada objeto no array representa um segmento de 8 segundos e deve conter as chaves "segmento" (number) e "prompt" (string).`
                : `O resultado DEVE ser uma lista numerada, onde cada item é o prompt para um segmento de 8 segundos.`;

            if (isContinuation) {
                systemInstruction = `Você é um Supervisor de Continuidade e Mestre Roteirista para cinema. Sua tarefa é continuar uma história a partir de prompts existentes.
                **Ideia Original:** "${idea}"
                **Prompts Existentes:**\n${existingPrompts}\n---
                **Sua Missão:** Crie os próximos ${segments} segmentos de 8 segundos, começando a numeração a partir de ${lastSegmentNumber + 1}. Mantenha a consistência de personagem, tom e narrativa. A transição do último prompt existente para o seu primeiro novo prompt deve ser perfeita.
                ${influencerInstruction}
                ${languageInstruction}
                ${backgroundInstruction}
                ${commercialInstruction}
                ${onScreenTextInstruction}
                ${formatInstruction}
                Não inclua nenhuma explicação ou texto adicional, apenas os novos segmentos.`;
            } else {
                systemInstruction = `Você é um roteirista multilíngue e diretor de cinema de elite, especialista em IAs de vídeo. Sua tarefa é criar uma sequência de prompts para a IA "Flow VEO" para gerar um vídeo de ${duration} segundos.
                A ideia da cena do usuário é: "${idea}".
                ${influencerInstruction}
                ${languageInstruction}
                ${backgroundInstruction}
                ${commercialInstruction}
                ${onScreenTextInstruction}
                Você deve dividir a cena em ${segments} segmentos de 8 segundos. Cada prompt deve continuar de onde o anterior parou, criando uma cena fluida e contínua.
                Para cada segmento, descreva vividamente a ação, o movimento da câmera, a iluminação, o estilo, o personagem (consistente com a ficha) E o diálogo/narração (se aplicável), garantindo que a transição para o próximo segmento seja natural.
                ${formatInstruction}
                Não inclua nenhuma explicação ou texto adicional, apenas o resultado no formato solicitado.`;
            }
        } else {
            systemInstruction = `Você é um diretor de cinema e engenheiro de prompts de elite, especialista em IAs de vídeo como Google VEO, Sora e Runway. Sua tarefa é transformar uma ideia simples de um usuário em um prompt cinematográfico rico e detalhado, otimizado para a IA de vídeo "${targetAI}".
            A ideia da cena é: "${idea}".
            ${influencerInstruction}
            ${languageInstruction}
            ${backgroundInstruction}
            ${commercialInstruction}
            ${onScreenTextInstruction}
            O prompt deve ser uma descrição vívida e evocativa. Inclua detalhes sobre:
            1.  **Cena e Assunto:** Descreva o ambiente (baseado na imagem de referência, se fornecida) e o personagem principal (consistente com a ficha, se fornecida).
            2.  **Ação e Diálogo/Narração:** O que está acontecendo e o que está sendo dito (se aplicável).
            3.  **Cinematografia:** Especifique o tipo de plano, ângulo e movimento da câmera.
            4.  **Iluminação:** Descreva a luz.
            5.  **Estilo Visual e Humor:** Defina o estilo e o humor.
            6.  **Duração e Parâmetros:** Se a IA for "Google VEO" ou "Flow VEO", especifique que o vídeo deve ter 8 segundos. Adapte a sintaxe para outras IAs.
            O resultado final deve ser APENAS o prompt, pronto para uso, sem explicações adicionais.`;
        }

        const config: any = {
            systemInstruction: systemInstruction,
            temperature: 0.9,
        };

        if (targetAI === 'Flow VEO' && (duration > 8 || isContinuation) && outputFormat === 'json') {
            config.responseMimeType = 'application/json';
            config.responseSchema = {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        segmento: { type: Type.INTEGER },
                        prompt: { type: Type.STRING },
                    },
                    required: ['segmento', 'prompt'],
                },
            };
        }

        const parts: ({ text: string } | { inlineData: { data: string; mimeType: string; } })[] = [{ text: `Ideia do usuário: "${idea}"` }];
        if (backgroundImageFile) {
            const bgImagePart = await fileToGenerativePart(backgroundImageFile);
            parts.push(bgImagePart);
        }
        if (logoFile) {
            const logoPart = await fileToGenerativePart(logoFile);
            parts.push(logoPart);
        }

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { role: 'user', parts: parts },
            config: config,
        });

        let responseText = response.text || '';
        if (config.responseMimeType === 'application/json') {
            try {
                responseText = JSON.stringify(JSON.parse(responseText), null, 2);
            } catch (e) {
                console.warn("Could not parse JSON response, returning raw text.", responseText);
            }
        }

        return responseText || '';
    } catch (error) {
        console.error("Error generating video prompt:", error);
        throw new Error(`Erro ao gerar prompt de vídeo: ${(error as Error).message || error}`);
    }
};

export interface CaptionVariation {
    variacao: number;
    gancho: string;
    desenvolvimento: string;
    cta: string;
    hashtags: string;
}

/**
 * Generates viral captions and hashtags for a video idea, optimized for a specific social media platform.
 */
export const generateCaptionsAndHashtags = async (videoIdea: string, platform: string): Promise<CaptionVariation[]> => {
    try {
        const platformName = SOCIAL_MEDIA_PLATFORMS.find(p => p.id === platform)?.name || platform;
        const systemInstruction = `Você é um estrategista de conteúdo viral de classe mundial, com especialização profunda em algoritmos e comportamento de usuário da plataforma **${platformName}**.
Sua missão é criar um pacote de publicação completo para um vídeo baseado na seguinte ideia: "${videoIdea}".

Sua resposta DEVE ser um array JSON. O array deve conter 3 objetos, cada um representando uma variação de legenda otimizada para **${platformName}**.

Cada objeto no array deve ter a seguinte estrutura:
- "variacao" (number): O número da variação (1, 2, ou 3).
- "gancho" (string): Uma primeira frase curta e impactante, usando técnicas de "anzol" para prender a atenção nos primeiros 2 segundos, seguindo as melhores práticas de ${platformName}.
- "desenvolvimento" (string): O corpo da legenda, que cria um "gargalo" de curiosidade, usando storytelling e técnicas de "copy cat" para manter o usuário engajado.
- "cta" (string): Uma chamada para ação (Call to Action) clara e eficaz, otimizada para o tipo de engajamento que o algoritmo de ${platformName} mais valoriza (ex: comentários, compartilhamentos, salvamentos).
- "hashtags" (string): Uma string única contendo as 10 melhores hashtags, pesquisadas e otimizadas para máxima visibilidade e alcance no nicho do vídeo dentro de ${platformName}. Inclua hashtags de cauda longa e de tendência. As hashtags devem ser separadas por espaços e começar com '#'.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { role: 'user', parts: [{ text: `Gere 3 variações de legenda para a ideia de vídeo: "${videoIdea}", otimizadas para ${platformName}` }] },
            config: {
                systemInstruction,
                temperature: 0.8,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            variacao: { type: Type.INTEGER },
                            gancho: { type: Type.STRING },
                            desenvolvimento: { type: Type.STRING },
                            cta: { type: Type.STRING },
                            hashtags: { type: Type.STRING },
                        },
                        required: ['variacao', 'gancho', 'desenvolvimento', 'cta', 'hashtags'],
                    },
                },
            },
        });

        const jsonText = response.text || '[]';
        return JSON.parse(jsonText) as CaptionVariation[];

    } catch (error) {
        console.error("Error generating captions:", error);
        throw new Error("Não foi possível gerar as legendas. Verifique o console para mais detalhes.");
    }
};

/**
 * Generates a detailed character sheet for a digital influencer.
 */
export const generateInfluencerPrompt = async (description: string, imageFile?: File): Promise<string> => {
    try {
        const systemInstruction = `Você é um "Character Designer" de elite para IAs generativas. Sua tarefa é criar um "Character Sheet" (ficha de personagem) extremamente detalhado e reutilizável. O resultado deve ser um único parágrafo denso de palavras-chave e frases curtas, separadas por vírgulas, robusto o suficiente para garantir a consistência do personagem em diferentes cenas e prompts.

O "Character Sheet" deve definir imutavelmente:
- **Rosto e Expressão:** Estrutura facial, formato e cor dos olhos, nariz, boca, expressão padrão.
- **Cabelo:** Cor, estilo, comprimento e textura.
- **Corpo:** Tipo físico, altura aproximada.
- **Estilo de Vestimenta:** Guarda-roupa principal (ex: cyberpunk com jaquetas de neon, streetwear minimalista, fantasia élfica).
- **Detalhes Únicos:** Tatuagens, cicatrizes, acessórios recorrentes (ex: óculos, piercings, colares).

Se uma imagem for fornecida, sua análise dela é a prioridade máxima. Se apenas texto for fornecido, baseie-se nele. O prompt final deve ser uma obra-prima de concisão e densidade de informação, pronto para ser copiado e colado. Não adicione nenhuma explicação, apenas o "Character Sheet".`;

        const parts: ({ text: string } | { inlineData: { data: string; mimeType: string; } })[] = [{ text: `Instrução do usuário: "${description}"` }];

        if (imageFile) {
            const imagePart = await fileToGenerativePart(imageFile);
            parts.push(imagePart);
        }

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { role: 'user', parts: parts },
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            }
        });

        return response.text || '';
    } catch (error) {
        console.error("Error generating influencer prompt:", error);
        throw new Error("Não foi possível gerar o prompt do influenciador. Verifique o console para mais detalhes.");
    }
};

export interface RemixScript {
    roteiro_narracao: string;
    instrucoes_remix: string;
}

/**
 * Generates a remix script for a video.
 */
export const generateRemixScript = async (videoFile: File, influencerPrompt: string, goal: string): Promise<RemixScript> => {
    try {
        const videoPart = await fileToGenerativePart(videoFile);

        let goalInstruction = '';
        switch (goal) {
            case 'views':
                goalInstruction = 'Otimize o roteiro para MÁXIMA VISUALIZAÇÃO. Use um gancho extremamente rápido, crie um loop de curiosidade e termine de forma abrupta para incentivar replays.';
                break;
            case 'interaction':
                goalInstruction = 'Otimize o roteiro para MÁXIMA INTERAÇÃO. Faça perguntas diretas, crie polêmica construtiva e inclua um CTA claro para comentários.';
                break;
            case 'followers':
                goalInstruction = 'Otimize o roteiro para GANHAR SEGUIDORES. Mostre a personalidade única do influenciador, crie uma conexão emocional e termine com um CTA forte para seguir.';
                break;
        }

        const systemInstruction = `Você é um Diretor de Conteúdo Viral e especialista em remixes para TikTok e Instagram Reels. Sua missão é analisar um vídeo de referência e criar um roteiro de 'Remix' para um influenciador digital específico.

Você receberá:
1. O vídeo para remixar (com até 30 segundos).
2. O 'Character Sheet' do influenciador que fará o remix.
3. O objetivo principal do remix.

Sua tarefa:
- Analise o vídeo frame a frame para entender o conteúdo, o ritmo e os momentos-chave.
- Crie uma narração/diálogo para o influenciador que seja relevante, espirituosa e consistente com sua personalidade (definida no Character Sheet).
- Crie instruções claras sobre COMO fazer o remix (ex: "Layout: Lado a Lado (Side-by-Side)", "Reação: Aponte para o objeto na tela aos 5 segundos", "Use o efeito 'Green Screen' com o vídeo original ao fundo").
- ${goalInstruction}

Sua resposta DEVE ser um objeto JSON com a seguinte estrutura: { "roteiro_narracao": "...", "instrucoes_remix": "..." }. Não inclua nenhuma explicação ou texto adicional.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                role: 'user',
                parts: [
                    videoPart,
                    { text: `Character Sheet do Influenciador:\n${influencerPrompt}\n\nObjetivo do Remix: ${goal}` }
                ]
            },
            config: {
                systemInstruction,
                temperature: 0.85,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        prova_de_analise: { type: Type.STRING },
                        pontos_fortes: { type: Type.ARRAY, items: { type: Type.STRING } },
                        pontos_a_melhorar: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['prova_de_analise', 'pontos_fortes', 'pontos_a_melhorar'],
                },
            },
        });

        const jsonText = response.text || '[]';
        return JSON.parse(jsonText) as RemixScript;

    } catch (error) {
        console.error("Error generating remix script:", error);
        throw new Error("Não foi possível gerar o roteiro de remix. Verifique o console para mais detalhes.");
    }
};

export interface InitialAnalysis {
    prova_de_analise: string;
    pontos_fortes: string[];
    pontos_a_melhorar: string[];
}

export interface ActionPlan {
    plano_de_acao: { passo: number; acao: string; }[];
    sugestao_de_conteudo_viral: {
        ideia: string;
        formato: string;
        roteiro_sugerido: string;
    };
}

/**
 * AGENT 1: The Digital Detective. Analyzes screenshots to provide an initial diagnosis.
 */
export const generateInitialProfileAnalysis = async (platform: string, username: string, goal: string, screenshots: File[]): Promise<InitialAnalysis> => {
    try {
        const platformName = SOCIAL_MEDIA_PLATFORMS.find(p => p.id === platform)?.name || platform;
        const systemInstruction = `Você é um consultor de marketing digital de elite, conhecido por sua honestidade "brutalmente necessária". Sua tarefa é analisar os screenshots do perfil de um usuário e fornecer um diagnóstico direto e sem rodeios.

**Contexto do Perfil:**
- **Plataforma:** ${platformName}
- **Nome de usuário:** @${username}
- **Objetivo Principal:** ${goal}

**Sua Análise:**
Analise os screenshots fornecidos. Seja direto, use uma linguagem forte e aponte as falhas de forma que "doam", mas que sejam para o bem do usuário.

**Formato de Saída Obrigatório:**
Sua resposta DEVE ser um objeto JSON com a seguinte estrutura:
- "prova_de_analise" (string): Uma frase curta citando algo ESPECÍFICO que você leu na imagem (ex: "Vi que sua bio diz 'X'..." ou "No seu último post sobre 'Y'..."). Isso é crucial para provar que você analisou o perfil.
- "pontos_fortes" (array de strings): 2-3 pontos que o perfil acerta, baseado nas imagens.
- "pontos_a_melhorar" (array de strings): 2-3 pontos fracos ou erros comuns que você observa, de forma direta e incisiva.`;

        const imageParts = await Promise.all(screenshots.map(fileToGenerativePart));

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { role: 'user', parts: [...imageParts, { text: `Analise este perfil para a plataforma ${platformName} com o objetivo de ${goal}.` }] },
            config: {
                systemInstruction,
                temperature: 0.85,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        prova_de_analise: { type: Type.STRING },
                        pontos_fortes: { type: Type.ARRAY, items: { type: Type.STRING } },
                        pontos_a_melhorar: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['prova_de_analise', 'pontos_fortes', 'pontos_a_melhorar'],
                },
            },
        });
        return JSON.parse(response.text || '{}') as InitialAnalysis;
    } catch (error) {
        console.error("Error generating strategic analysis:", error);
        throw new Error("Não foi possível gerar a análise estratégica.");
    }
};

/**
 * AGENT 2: The Growth Hacker. Creates an action plan based on an analysis.
 */
export const generateActionPlan = async (analysis: InitialAnalysis, goal: string, platform: string): Promise<ActionPlan> => {
    try {
        const platformName = SOCIAL_MEDIA_PLATFORMS.find(p => p.id === platform)?.name || platform;
        const systemInstruction = `Você é um "Growth Hacker" e estrategista de conteúdo. Você recebeu um diagnóstico de um perfil e agora precisa criar um plano de ação para atingir o objetivo do usuário.

**Diagnóstico Recebido:**
- **Pontos Fortes:** ${analysis.pontos_fortes.join(', ')}
- **Pontos a Melhorar:** ${analysis.pontos_a_melhorar.join(', ')}
- **Objetivo Principal:** ${goal}

**Sua Missão:**
Crie um plano de ação concreto e passo a passo e uma ideia de conteúdo viral que resolva os "pontos a melhorar" e capitalize os "pontos fortes" para atingir o objetivo.

**Formato de Saída Obrigatório:**
Sua resposta DEVE ser um objeto JSON com a seguinte estrutura:
- "plano_de_acao" (array de objetos): Uma lista de 3-4 passos acionáveis. Cada objeto deve ter "passo" (number) e "acao" (string).
- "sugestao_de_conteudo_viral" (objeto): Uma ideia de post viral.
  - "ideia" (string): O conceito central do post.
  - "formato" (string): O melhor formato para esta ideia em ${platformName}.
  - "roteiro_sugerido" (string): Um breve roteiro ou passo a passo para criar o conteúdo.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { role: 'user', parts: [{ text: `Crie um plano de ação para este perfil no ${platformName}.` }] },
            config: {
                systemInstruction,
                temperature: 0.9,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        plano_de_acao: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    passo: { type: Type.INTEGER },
                                    acao: { type: Type.STRING },
                                },
                                required: ['passo', 'acao'],
                            },
                        },
                        sugestao_de_conteudo_viral: {
                            type: Type.OBJECT,
                            properties: {
                                ideia: { type: Type.STRING },
                                formato: { type: Type.STRING },
                                roteiro_sugerido: { type: Type.STRING },
                            },
                            required: ['ideia', 'formato', 'roteiro_sugerido'],
                        },
                    },
                    required: ['plano_de_acao', 'sugestao_de_conteudo_viral'],
                },
            },
        });
        return JSON.parse(response.text || '{}') as ActionPlan;
    } catch (error) {
        console.error("Error generating action plan:", error);
        throw new Error("Não foi possível gerar o plano de ação.");
    }
};
