
import React, { useState, useEffect, useMemo, DragEvent } from 'react';
import { generatePromptFromText, generatePromptFromImage, generatePromptFromVideoIdea, generateCaptionsAndHashtags, CaptionVariation, generateInfluencerPrompt, generateRemixScript, RemixScript, generateInitialProfileAnalysis, generateActionPlan, InitialAnalysis, ActionPlan, generateImageEditPrompt } from './lib/gemini';

import { TextIcon, ImageIcon, VideoIcon, CopyIcon, CheckIcon, UploadIcon, SparklesIcon, LightbulbIcon, MegaphoneIcon, UserCircleIcon, RemixIcon, ChartBarIcon, ExternalLinkIcon, PlusCircleIcon, MagicWandIcon, ClipboardCheckIcon } from './components/icons';
import { AI_MODELS, IDEA_SUGGESTIONS, DIALOGUE_LANGUAGES, SOCIAL_MEDIA_PLATFORMS, VIDEO_DURATIONS, ANALYSIS_GOALS } from './constants';
import { UserRegistrationModal } from './components/UserRegistrationModal';
import { getUserData, hasReachedLimit, incrementUsageCount, saveUserData } from './lib/userUtils';
import { AdminDashboard } from './components/AdminDashboard';
import { registerLead, checkLeadAccess, incrementLeadUsage, supabase } from './lib/supabase';
import { ErrorBoundary } from './components/ErrorBoundary';

type ActiveTab = 'text' | 'image' | 'image-edit' | 'video' | 'remix' | 'analysis';
type OutputFormat = 'normal' | 'json';
type InfluencerOption = 'none' | 'create' | 'existing';
type ExistingInfluencerMethod = 'paste' | 'upload';
type RemixGoal = 'views' | 'interaction' | 'followers';
type VideoType = 'normal' | 'commercial';
type RemixNarrationOption = 'voice_only' | 'create_influencer' | 'use_influencer';

const fallbackCopyTextToClipboard = (text: string, onSuccess: () => void, onError: () => void) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            onSuccess();
        } else {
            onError();
        }
    } catch (err) {
        console.error('Fallback copy failed: ', err);
        onError();
    }
    document.body.removeChild(textArea);
};

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('text');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedPrompt, setGeneratedPrompt] = useState<string>('');

    const [inputText, setInputText] = useState<string>('');
    const [videoIdea, setVideoIdea] = useState<string>('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageInstruction, setImageInstruction] = useState<string>('');
    const [wantsImageUpload, setWantsImageUpload] = useState<boolean>(true);
    const [copiedIdentifier, setCopiedIdentifier] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    // User Registration & Limits
    const [isUserRegistered, setIsUserRegistered] = useState<boolean>(true); // Default true to avoid flash, checked in useEffect
    const [showRegistrationModal, setShowRegistrationModal] = useState<boolean>(false);
    const [isLimitReached, setIsLimitReached] = useState<boolean>(false);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    useEffect(() => {
        // Check for Admin Mode
        const params = new URLSearchParams(window.location.search);
        if (params.get('admin') === 'true') {
            console.log("Admin mode detected in App.tsx RE-ADDED");
            setIsAdmin(true);
            return;
        }

        // Check Local Registration
        const userData = getUserData();
        if (!userData) {
            setIsUserRegistered(false);
        } else {
            // If we have local data, we could sync with Supabase here if needed
            // For now, we rely on the initial registration
        }
    }, []);

    const checkAccess = async (feature: string): Promise<boolean> => {
        if (!isUserRegistered) {
            setShowRegistrationModal(true);
            return false;
        }

        // 1. Try Supabase Check (if configured)
        const userData = getUserData();
        if (supabase && userData?.whatsapp) {
            const { allowed, limitReached } = await checkLeadAccess(userData.whatsapp, feature);
            if (!allowed) {
                if (limitReached) setIsLimitReached(true);
                setShowRegistrationModal(true);
                return false;
            }
            return true;
        }

        // 2. Fallback to LocalStorage
        if (hasReachedLimit(feature)) {
            setIsLimitReached(true);
            setShowRegistrationModal(true);
            return false;
        }
        return true;
    };

    const recordUsage = async (feature: string) => {
        // 1. Local
        incrementUsageCount(feature);

        // 2. Supabase
        const userData = getUserData();
        if (supabase && userData?.whatsapp) {
            await incrementLeadUsage(userData.whatsapp);
        }
    };

    const handleRegistration = async (data: { name: string, whatsapp: string, email: string }) => {
        saveUserData(data);
        setIsUserRegistered(true);
        setShowRegistrationModal(false);

        // Sync to Supabase
        if (supabase) {
            await registerLead(data.name, data.whatsapp, data.email);
        }
    };



    const [showContinueUI, setShowContinueUI] = useState(false);

    const filteredAIModels = useMemo(() => AI_MODELS.filter(m => m.type === activeTab), [activeTab]);
    const [targetAI, setTargetAI] = useState<string>(filteredAIModels[0]?.id || '');

    // Video specific state
    const [videoDuration, setVideoDuration] = useState<number>(8);
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('normal');
    const [dialogueLanguage, setDialogueLanguage] = useState<string>('sem-dialogo');
    const [additionalDuration, setAdditionalDuration] = useState(8);
    const [isContinuationLoading, setIsContinuationLoading] = useState(false);
    const [videoBgImageFile, setVideoBgImageFile] = useState<File | null>(null);
    const [videoBgImagePreview, setVideoBgImagePreview] = useState<string | null>(null);
    const [videoType, setVideoType] = useState<VideoType>('normal');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // Image Edit state
    const [editImageFile, setEditImageFile] = useState<File | null>(null);
    const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
    const [editImagePrompt, setEditImagePrompt] = useState('');

    // Influencer state
    const [influencerOption, setInfluencerOption] = useState<InfluencerOption>('none');
    const [existingInfluencerMethod, setExistingInfluencerMethod] = useState<ExistingInfluencerMethod>('paste');
    const [influencerDescription, setInfluencerDescription] = useState('');
    const [influencerImageFile, setInfluencerImageFile] = useState<File | null>(null);
    const [influencerImagePreview, setInfluencerImagePreview] = useState<string | null>(null);
    void influencerImagePreview; // Silence unused warning
    const [existingInfluencerPrompt, setExistingInfluencerPrompt] = useState('');
    const [generatedInfluencerPrompt, setGeneratedInfluencerPrompt] = useState('');
    const [isInfluencerLoading, setIsInfluencerLoading] = useState(false);
    const [influencerError, setInfluencerError] = useState<string | null>(null);

    // Remix state
    const [remixVideoFile, setRemixVideoFile] = useState<File | null>(null);
    const [remixVideoPreview, setRemixVideoPreview] = useState<string | null>(null);
    const [remixGoal, setRemixGoal] = useState<RemixGoal>('views');
    const [remixNarrationOption, setRemixNarrationOption] = useState<RemixNarrationOption>('voice_only');
    const [isRemixLoading, setIsRemixLoading] = useState(false);
    const [remixError, setRemixError] = useState<string | null>(null);
    const [generatedRemixScript, setGeneratedRemixScript] = useState<RemixScript | null>(null);

    // Analysis state
    const [analysisPlatform, setAnalysisPlatform] = useState<string>(SOCIAL_MEDIA_PLATFORMS[0].id);
    const [analysisUsername, setAnalysisUsername] = useState('');
    const [analysisScreenshots, setAnalysisScreenshots] = useState<File[]>([]);
    const [analysisGoal, setAnalysisGoal] = useState<string>(ANALYSIS_GOALS[0].id);
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [initialAnalysis, setInitialAnalysis] = useState<InitialAnalysis | null>(null);
    const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);

    // Captions state
    const [socialPlatform, setSocialPlatform] = useState<string>(SOCIAL_MEDIA_PLATFORMS[0].id);
    const [isCaptionsLoading, setIsCaptionsLoading] = useState<boolean>(false);
    const [captionsError, setCaptionsError] = useState<string | null>(null);
    const [generatedCaptions, setGeneratedCaptions] = useState<CaptionVariation[] | null>(null);

    const finalInfluencerPrompt = useMemo(() => {
        if (influencerOption === 'create') return generatedInfluencerPrompt;
        if (influencerOption === 'existing') return existingInfluencerPrompt;
        if (remixNarrationOption === 'create_influencer') return generatedInfluencerPrompt;
        if (remixNarrationOption === 'use_influencer') return existingInfluencerPrompt;
        return '';
    }, [influencerOption, remixNarrationOption, generatedInfluencerPrompt, existingInfluencerPrompt]);

    useEffect(() => {
        const currentModels = AI_MODELS.filter(m => m.type === activeTab);
        if (currentModels.length > 0) {
            setTargetAI(currentModels[0].id);
        }
    }, [activeTab]);

    const resetState = (fullReset = true) => {
        setError(null);
        setGeneratedPrompt('');
        setGeneratedRemixScript(null);
        setRemixError(null);
        setInitialAnalysis(null);
        setActionPlan(null);
        setAnalysisError(null);
        setShowContinueUI(false);
        setCopiedIdentifier(null);
        if (fullReset) {
            setGeneratedCaptions(null);
            setCaptionsError(null);
        }
    };

    const handleGenerateIdea = () => {
        const randomIndex = Math.floor(Math.random() * IDEA_SUGGESTIONS.length);
        const idea = IDEA_SUGGESTIONS[randomIndex];

        if (activeTab === 'text') setInputText(idea);
        else if (activeTab === 'video') setVideoIdea(idea);
        else if (activeTab === 'image') setImageInstruction(idea);
        else if (activeTab === 'image-edit') setEditImagePrompt(idea);
    };

    const handleTextSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || isLoading) return;
        if (!await checkAccess('text')) return;

        resetState();
        setIsLoading(true);
        try {
            const prompt = await generatePromptFromText(inputText, targetAI);
            setGeneratedPrompt(prompt);
            await recordUsage('text');
        } catch (err: any) { setError(err.message || 'Ocorreu um erro desconhecido.'); }
        finally { setIsLoading(false); }
    };

    const handleFileChange = (file: File | null, type: 'image' | 'influencer' | 'remix' | 'videoBg' | 'editImage' | 'logo' | 'analysis') => {
        if (!file) return;

        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (type === 'remix' && !isVideo) {
            setRemixError("Por favor, selecione um arquivo de vídeo válido.");
            return;
        }
        if (type !== 'remix' && !isImage && type !== 'analysis') {
            setError("Por favor, selecione um arquivo de imagem válido.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            switch (type) {
                case 'image':
                    resetState();
                    setImageFile(file);
                    setImagePreview(result);
                    break;
                case 'influencer':
                    setInfluencerImageFile(file);
                    setInfluencerImagePreview(result);
                    if (influencerOption === 'existing' || remixNarrationOption === 'use_influencer') {
                        handleGenerateInfluencerFromImage(file);
                    }
                    break;
                case 'remix':
                    if (file.size > 30 * 1024 * 1024) { // 30MB limit
                        setRemixError("O vídeo deve ter no máximo 30 segundos (aprox. 30MB).");
                        return;
                    }
                    setRemixVideoFile(file);
                    setRemixVideoPreview(result);
                    setRemixError(null);
                    break;
                case 'videoBg':
                    setVideoBgImageFile(file);
                    setVideoBgImagePreview(result);
                    break;
                case 'logo':
                    setLogoFile(file);
                    setLogoPreview(result);
                    break;
                case 'editImage':
                    setEditImageFile(file);
                    setEditImagePreview(result);
                    break;
                case 'analysis':
                    setAnalysisScreenshots(prev => [...prev, file]);
                    break;
            }
        };
        reader.readAsDataURL(file);
    };

    const handleImageSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        if (wantsImageUpload && !imageFile) return;
        if (!wantsImageUpload && !imageInstruction.trim()) return;
        if (!await checkAccess('image')) return;

        resetState();
        setIsLoading(true);
        try {
            const prompt = await generatePromptFromImage(wantsImageUpload ? imageFile : null, imageInstruction, targetAI);
            setGeneratedPrompt(prompt);
            await recordUsage('image');
        } catch (err: any) { setError(err.message || 'Ocorreu um erro desconhecido.'); }
        finally { setIsLoading(false); }
    };

    const handleImageEditPromptSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editImageFile || !editImagePrompt.trim() || isLoading) return;
        if (!await checkAccess('image-edit')) return;

        resetState();
        setIsLoading(true);
        try {
            const prompt = await generateImageEditPrompt(editImageFile, editImagePrompt);
            setGeneratedPrompt(prompt);
            await recordUsage('image-edit');
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao gerar o prompt de edição.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateInfluencer = async () => {
        if (!influencerDescription.trim() || isInfluencerLoading) return;
        setInfluencerError(null);
        setIsInfluencerLoading(true);
        try {
            const prompt = await generateInfluencerPrompt(influencerDescription, influencerImageFile || undefined);
            setGeneratedInfluencerPrompt(prompt);
        } catch (err: any) { setInfluencerError(err.message || 'Ocorreu um erro desconhecido.'); }
        finally { setIsInfluencerLoading(false); }
    };

    const handleGenerateInfluencerFromImage = async (file: File) => {
        setInfluencerError(null);
        setIsInfluencerLoading(true);
        try {
            const prompt = await generateInfluencerPrompt("Crie um Character Sheet detalhado baseado na imagem deste personagem.", file);
            setExistingInfluencerPrompt(prompt);
        } catch (err: any) { setInfluencerError(err.message || 'Ocorreu um erro desconhecido.'); }
        finally { setIsInfluencerLoading(false); }
    };

    const handleVideoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!videoIdea.trim() || isLoading) return;
        if (!await checkAccess('video')) return;

        resetState();
        setIsLoading(true);
        try {
            const options = {
                duration: videoDuration,
                outputFormat: outputFormat,
                dialogueLanguage: dialogueLanguage,
                influencerPrompt: finalInfluencerPrompt,
                backgroundImageFile: videoBgImageFile || undefined,
                logoFile: logoFile || undefined,
                videoType: videoType,
            };
            const prompt = await generatePromptFromVideoIdea(videoIdea, targetAI, options);
            setGeneratedPrompt(prompt);
            await recordUsage('video');
        } catch (err: any) { setError(err.message || 'Ocorreu um erro desconhecido.'); }
        finally { setIsLoading(false); }
    };

    const handleContinueStory = async () => {
        if (!videoIdea.trim() || isContinuationLoading) return;
        setIsContinuationLoading(true);
        setError(null);
        try {
            const options = {
                duration: additionalDuration,
                outputFormat: outputFormat,
                dialogueLanguage: dialogueLanguage,
                influencerPrompt: finalInfluencerPrompt,
                existingPrompts: generatedPrompt,
                backgroundImageFile: videoBgImageFile || undefined,
                logoFile: logoFile || undefined,
                videoType: videoType,
            };
            const newSegments = await generatePromptFromVideoIdea(videoIdea, targetAI, options);

            if (outputFormat === 'json') {
                const existingJson = JSON.parse(generatedPrompt);
                const newJson = JSON.parse(newSegments);
                const combined = [...existingJson, ...newJson];
                setGeneratedPrompt(JSON.stringify(combined, null, 2));
            } else {
                setGeneratedPrompt(prev => `${prev}\n${newSegments}`);
            }
            setShowContinueUI(false);

        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro desconhecido ao continuar a história.');
        } finally {
            setIsContinuationLoading(false);
        }
    };

    const handleGenerateRemix = async () => {
        if (!remixVideoFile || isRemixLoading) return;
        if (!await checkAccess('remix')) return;

        let influencerForRemix = finalInfluencerPrompt;
        if (remixNarrationOption === 'voice_only') {
            influencerForRemix = '';
        } else if (!finalInfluencerPrompt.trim()) {
            setRemixError("Por favor, defina o influenciador para esta opção de remix.");
            return;
        }

        setRemixError(null);
        setGeneratedRemixScript(null);
        setIsRemixLoading(true);
        try {
            const script = await generateRemixScript(remixVideoFile, influencerForRemix, remixGoal);
            setGeneratedRemixScript(script);
            await recordUsage('remix');
        } catch (err: any) {
            setRemixError(err.message || 'Ocorreu um erro desconhecido.');
        } finally {
            setIsRemixLoading(false);
        }
    };

    const handleInitialAnalysis = async () => {
        if (analysisScreenshots.length === 0 || isAnalysisLoading) return;
        if (!await checkAccess('analysis')) return;

        resetState();
        setIsAnalysisLoading(true);
        try {
            const result = await generateInitialProfileAnalysis(analysisPlatform, analysisUsername, analysisGoal, analysisScreenshots);
            setInitialAnalysis(result);
            await recordUsage('analysis');
        } catch (err: any) {
            setAnalysisError(err.message || 'Ocorreu um erro desconhecido.');
        } finally {
            setIsAnalysisLoading(false);
        }
    };

    const handleGenerateActionPlan = async () => {
        if (!initialAnalysis || isAnalysisLoading) return;
        setIsAnalysisLoading(true);
        setAnalysisError(null);
        try {
            const plan = await generateActionPlan(initialAnalysis, analysisGoal, analysisPlatform);
            setActionPlan(plan);
        } catch (err: any) {
            setAnalysisError(err.message || 'Ocorreu um erro desconhecido ao gerar o plano de ação.');
        } finally {
            setIsAnalysisLoading(false);
        }
    };

    const handleGenerateCaptions = async () => {
        if (!videoIdea.trim() || isCaptionsLoading) return;
        setCaptionsError(null);
        setGeneratedCaptions(null);
        try {
            const captions = await generateCaptionsAndHashtags(videoIdea, socialPlatform);
            setGeneratedCaptions(captions);
        } catch (err: any) { setCaptionsError(err.message || 'Ocorreu um erro desconhecido.'); }
        finally { setIsCaptionsLoading(false); }
    };

    const handleCopyToClipboard = (text: string, identifier: string) => {
        if (!text) return;

        const setCopied = () => {
            setCopiedIdentifier(identifier);
            setTimeout(() => setCopiedIdentifier(null), 2000);
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(setCopied).catch(() => {
                fallbackCopyTextToClipboard(text, setCopied, () => console.error('Fallback copy failed.'));
            });
        } else {
            fallbackCopyTextToClipboard(text, setCopied, () => console.error('Fallback copy failed.'));
        }
    };

    const handleDragEvents = (e: DragEvent<HTMLLabelElement>, dragging: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(dragging);
    };

    const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
        handleDragEvents(e, false);
        handleFileChange(e.dataTransfer.files[0], 'image');
    };

    const TabButton: React.FC<{ tab: ActiveTab; label: string; icon: React.ReactNode }> = ({ tab, label, icon }) => (
        <button
            onClick={() => {
                setActiveTab(tab);
                resetState(true);
                // Reset all inputs
                setInputText('');
                setImageFile(null);
                setImagePreview(null);
                setImageInstruction('');
                setVideoIdea('');
                setRemixVideoFile(null);
                setRemixVideoPreview(null);
                setAnalysisUsername('');
                setAnalysisScreenshots([]);
                setVideoBgImageFile(null);
                setVideoBgImagePreview(null);
                setLogoFile(null);
                setLogoPreview(null);
                setEditImageFile(null);
                setEditImagePreview(null);
                setEditImagePrompt('');
                // Reset video options
                setVideoDuration(8);
                setOutputFormat('normal');
                setDialogueLanguage('sem-dialogo');
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${activeTab === tab ? 'bg-slate-700 text-cyan-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
            aria-pressed={activeTab === tab}
        >
            {icon}
            {label}
        </button>
    );

    const IdeaButton = () => (
        <button type="button" onClick={handleGenerateIdea} className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors" aria-label="Gerar uma ideia aleatória">
            <LightbulbIcon className="w-4 h-4" /> Me dê uma ideia
        </button>
    );

    const RadioPillGroup: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
            <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg p-1">{children}</div>
        </div>
    );

    const RadioPill: React.FC<{ name: string; value: any; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement> | (() => void)) => void; label: string; }> = ({ name, value, checked, onChange, label }) => (
        <label className={`flex-1 text-center cursor-pointer px-3 py-1.5 text-sm rounded-md transition-colors ${checked ? 'bg-slate-700 text-cyan-300' : 'text-slate-400 hover:bg-slate-800'}`}>
            <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
            {label}
        </label>
    );

    const InfluencerStudio = ({ forRemix = false }) => (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-4">
            <h3 className="text-md font-semibold text-slate-200 flex items-center gap-2"><UserCircleIcon className="w-6 h-6 text-cyan-400" /> Estúdio de Influenciador</h3>
            <RadioPillGroup label={forRemix ? "Tipo de Narração:" : "Usar influenciador?"}>
                {!forRemix && <RadioPill name="influencer" value="none" checked={influencerOption === 'none'} onChange={() => setInfluencerOption('none')} label="Não quero" />}
                {forRemix && <RadioPill name="remix-narration" value="voice_only" checked={remixNarrationOption === 'voice_only'} onChange={() => setRemixNarrationOption('voice_only')} label="Somente Voz" />}
                <RadioPill name={forRemix ? "remix-narration" : "influencer"} value={forRemix ? "create_influencer" : "create"} checked={forRemix ? remixNarrationOption === 'create_influencer' : influencerOption === 'create'} onChange={() => forRemix ? setRemixNarrationOption('create_influencer') : setInfluencerOption('create')} label="Criar Novo" />
                <RadioPill name={forRemix ? "remix-narration" : "influencer"} value={forRemix ? "use_influencer" : "existing"} checked={forRemix ? remixNarrationOption === 'use_influencer' : influencerOption === 'existing'} onChange={() => forRemix ? setRemixNarrationOption('use_influencer') : setInfluencerOption('existing')} label="Usar Existente" />
            </RadioPillGroup>

            {(influencerOption === 'create' || remixNarrationOption === 'create_influencer') && (
                <div className="space-y-4 pt-2 animate-fade-in">
                    <div className="space-y-2">
                        <label htmlFor="influencer-desc" className="block text-sm font-medium text-slate-300">1. Descreva seu influenciador:</label>
                        <textarea id="influencer-desc" value={influencerDescription} onChange={(e) => setInfluencerDescription(e.target.value)} placeholder="Ex: mulher jovem, cabelo rosa neon, estilo cyberpunk, jaqueta de couro preta, olhos azuis brilhantes" className="w-full h-24 p-3 bg-slate-800 border border-slate-700 rounded-md resize-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="influencer-img-create" className="block text-sm font-medium text-slate-300">2. (Opcional) Envie uma imagem de referência de ESTILO:</label>
                        <input id="influencer-img-create" type="file" accept="image/*" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null, 'influencer')} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100" />
                    </div>
                    <button type="button" onClick={handleGenerateInfluencer} disabled={isInfluencerLoading || !influencerDescription.trim()} className="w-full flex items-center justify-center gap-2 bg-cyan-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-cyan-700 disabled:bg-slate-600 transition-all">
                        <SparklesIcon className="w-5 h-5" /> {isInfluencerLoading ? 'Criando Personagem...' : '3. Gerar Prompt do Influenciador'}
                    </button>
                    {influencerError && <p className="text-red-400 text-sm">{influencerError}</p>}
                    {generatedInfluencerPrompt && <div className="bg-slate-900/70 p-3 rounded-md text-sm text-slate-300 border border-cyan-500/30">{generatedInfluencerPrompt}</div>}
                </div>
            )}
            {(influencerOption === 'existing' || remixNarrationOption === 'use_influencer') && (
                <div className="space-y-4 pt-2 animate-fade-in">
                    <RadioPillGroup label="Método">
                        <RadioPill name="existing-method" value="paste" checked={existingInfluencerMethod === 'paste'} onChange={() => setExistingInfluencerMethod('paste')} label="Colar Prompt" />
                        <RadioPill name="existing-method" value="upload" checked={existingInfluencerMethod === 'upload'} onChange={() => setExistingInfluencerMethod('upload')} label="Subir Imagem" />
                    </RadioPillGroup>
                    {existingInfluencerMethod === 'paste' ? (
                        <div className="space-y-2">
                            <label htmlFor="existing-influencer" className="block text-sm font-medium text-slate-300">Cole aqui o "Character Sheet":</label>
                            <textarea id="existing-influencer" value={existingInfluencerPrompt} onChange={(e) => setExistingInfluencerPrompt(e.target.value)} placeholder="Ex: a beautiful woman, 25yo, long pink hair, blue eyes, cyberpunk style..." className="w-full h-24 p-3 bg-slate-800 border border-slate-700 rounded-md resize-none focus:ring-2 focus:ring-cyan-500" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label htmlFor="influencer-img-existing" className="block text-sm font-medium text-slate-300">Suba uma imagem do seu influenciador para gerar o prompt:</label>
                            <input id="influencer-img-existing" type="file" accept="image/*" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null, 'influencer')} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100" />
                            {isInfluencerLoading && <p className="text-cyan-400 text-sm">Analisando imagem e criando Character Sheet...</p>}
                            {influencerError && <p className="text-red-400 text-sm">{influencerError}</p>}
                            {existingInfluencerPrompt && <div className="bg-slate-900/70 p-3 rounded-md text-sm text-slate-300 border border-cyan-500/30">{existingInfluencerPrompt}</div>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const currentAIModel = AI_MODELS.find(m => m.id === targetAI);
    const currentSocialPlatform = SOCIAL_MEDIA_PLATFORMS.find(p => p.id === socialPlatform);

    if (isAdmin) {
        console.log("Rendering AdminDashboard from App.tsx");
        return (
            <ErrorBoundary>
                <AdminDashboard />
            </ErrorBoundary>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500/30" style={{ backgroundImage: 'url(/bg-cyberpunk.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>

            {/* Background Image */}
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-0"></div>
            <div className="fixed inset-0 bg-gradient-to-b from-slate-900/80 via-transparent to-slate-900/80 z-0 pointer-events-none"></div>

            <main className="relative z-10 w-full max-w-2xl mx-auto p-4 sm:p-6 flex flex-col min-h-screen">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold gradient-text">Criador de Prompts IA</h1>
                    <p className="mt-3 text-slate-400 max-w-md mx-auto">Seu estúdio de produção de conteúdo de ponta a ponta.</p>
                </header>

                <UserRegistrationModal
                    isOpen={showRegistrationModal}
                    onRegister={(data) => handleRegistration(data)}
                    isLimitReached={isLimitReached}
                />

                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 mb-6 flex flex-wrap justify-center gap-1 sm:gap-2">
                    <TabButton tab="text" label="Texto" icon={<TextIcon className="w-5 h-5" />} />
                    <TabButton tab="image" label="Imagem" icon={<ImageIcon className="w-5 h-5" />} />
                    <TabButton tab="image-edit" label="Prompt de Edição" icon={<MagicWandIcon className="w-5 h-5" />} />
                    <TabButton tab="video" label="Vídeo" icon={<VideoIcon className="w-5 h-5" />} />
                    <TabButton tab="remix" label="Remix" icon={<RemixIcon className="w-5 h-5" />} />
                    <TabButton tab="analysis" label="IA Analisa Minha Rede Social?" icon={<ChartBarIcon className="w-5 h-5" />} />
                </div>

                <div className="space-y-6">
                    {activeTab !== 'remix' && activeTab !== 'analysis' && (
                        <div>
                            <label htmlFor="ai-selector" className="block text-sm font-medium text-slate-300 mb-2">Otimizar prompt para qual IA?</label>
                            <select id="ai-selector" value={targetAI} onChange={(e) => setTargetAI(e.target.value)} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition">
                                {filteredAIModels.map(model => (<option key={model.id} value={model.id}>{model.name}</option>))}
                            </select>
                        </div>
                    )}

                    {activeTab === 'video' && (
                        <div className="space-y-4 animate-fade-in">
                            <InfluencerStudio />
                            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-4">
                                <h3 className="text-md font-semibold text-slate-200">Opções da Cena</h3>
                                <RadioPillGroup label="Tipo de Vídeo">
                                    <RadioPill name="video-type" value="normal" checked={videoType === 'normal'} onChange={() => setVideoType('normal')} label="Cena Normal" />
                                    <RadioPill name="video-type" value="commercial" checked={videoType === 'commercial'} onChange={() => setVideoType('commercial')} label="Comercial" />
                                </RadioPillGroup>
                                {videoType === 'commercial' && (
                                    <div className="space-y-2 animate-fade-in">
                                        <label htmlFor="logo-upload" className="block text-sm font-medium text-slate-300">Logomarca da Empresa (Opcional):</label>
                                        <input id="logo-upload" type="file" accept="image/*" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null, 'logo')} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-slate-300 hover:file:bg-slate-600" />
                                        {logoPreview && <img src={logoPreview} alt="Pré-visualização da Logo" className="w-24 h-24 object-contain rounded-lg mt-2 bg-white/10 p-1" />}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label htmlFor="video-bg-upload" className="block text-sm font-medium text-slate-300">Cenário do Vídeo (Opcional):</label>
                                    <input id="video-bg-upload" type="file" accept="image/*" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null, 'videoBg')} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-slate-300 hover:file:bg-slate-600" />
                                    {videoBgImagePreview && <img src={videoBgImagePreview} alt="Pré-visualização do Cenário" className="w-full h-32 object-cover rounded-lg mt-2" />}
                                </div>
                                {targetAI === 'Flow VEO' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <RadioPillGroup label="Duração do Vídeo">
                                            {VIDEO_DURATIONS.map(d => <RadioPill key={d} name="duration" value={d} checked={videoDuration === d} onChange={() => setVideoDuration(d)} label={`${d}s`} />)}
                                        </RadioPillGroup>
                                        <RadioPillGroup label="Formato da Saída">
                                            <RadioPill name="format" value="normal" checked={outputFormat === 'normal'} onChange={() => setOutputFormat('normal')} label="Normal" />
                                            <RadioPill name="format" value="json" checked={outputFormat === 'json'} onChange={() => setOutputFormat('json')} label="JSON" />
                                        </RadioPillGroup>
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="language-selector" className="block text-sm font-medium text-slate-300 mb-2">Idioma do Diálogo / Narração</label>
                                    <select id="language-selector" value={dialogueLanguage} onChange={(e) => setDialogueLanguage(e.target.value)} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-cyan-500 transition">
                                        {DIALOGUE_LANGUAGES.map(lang => (<option key={lang.id} value={lang.id}>{lang.name}</option>))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="min-h-[150px]">
                        {activeTab === 'text' && (<form onSubmit={handleTextSubmit} className="space-y-2"><div className="flex justify-between items-center"><label htmlFor="text-input" className="block text-sm font-medium text-slate-300">Descreva o assunto ou tema:</label><IdeaButton /></div><textarea id="text-input" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Ex: um logo para uma cafeteria moderna..." className="w-full h-32 p-3 bg-slate-800 border border-slate-700 rounded-md resize-none focus:ring-2 focus:ring-cyan-500 transition" disabled={isLoading} aria-label="Descreva o assunto ou tema" /><button type="submit" disabled={isLoading || !inputText.trim()} className="w-full flex items-center justify-center gap-2 bg-cyan-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-cyan-700 disabled:bg-slate-600 transition-all !mt-4"><SparklesIcon className="w-5 h-5" />{isLoading ? 'Gerando...' : 'Gerar Prompt'}</button></form>)}
                        {activeTab === 'image' && (
                            <form onSubmit={handleImageSubmit} className="space-y-4">
                                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Quer subir uma foto de referência?</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" checked={wantsImageUpload} onChange={() => setWantsImageUpload(true)} className="text-cyan-500 focus:ring-cyan-500" />
                                            <span className="text-slate-300">Sim</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" checked={!wantsImageUpload} onChange={() => setWantsImageUpload(false)} className="text-cyan-500 focus:ring-cyan-500" />
                                            <span className="text-slate-300">Não, apenas descrever</span>
                                        </label>
                                    </div>
                                </div>

                                {wantsImageUpload && (
                                    <label htmlFor="image-upload" onDragOver={(e) => handleDragEvents(e, true)} onDragLeave={(e) => handleDragEvents(e, false)} onDrop={handleDrop} className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-cyan-400 bg-slate-700/50' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'}`}>{imagePreview ? <img src={imagePreview} alt="Pré-visualização" className="object-contain h-full w-full rounded-lg p-2" /> : <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center"><UploadIcon className="w-10 h-10 mb-3 text-slate-500" /><p className="mb-2 text-sm text-slate-400"><span className="font-semibold">Clique para enviar</span> ou arraste e solte</p><p className="text-xs text-slate-500">PNG, JPG, GIF ou WEBP</p></div>}<input id="image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null, 'image')} disabled={isLoading} /></label>
                                )}

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label htmlFor="image-instruction" className="block text-sm font-medium text-slate-300">
                                            {wantsImageUpload ? "O que você quer mudar ou adicionar? (Opcional)" : "Descreva a imagem que você quer criar:"}
                                        </label>
                                        <IdeaButton />
                                    </div>
                                    <textarea id="image-instruction" value={imageInstruction} onChange={(e) => setImageInstruction(e.target.value)} placeholder={wantsImageUpload ? "Ex: me transforme em um astronauta..." : "Ex: um gato astronauta voando no espaço sideral..."} className="w-full h-24 p-3 bg-slate-800 border border-slate-700 rounded-md resize-none focus:ring-2 focus:ring-cyan-500 transition" disabled={isLoading} aria-label="Instruções para a imagem" />
                                </div>
                                <button type="submit" disabled={isLoading || (wantsImageUpload && !imageFile) || (!wantsImageUpload && !imageInstruction.trim())} className="w-full flex items-center justify-center gap-2 bg-cyan-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-cyan-700 disabled:bg-slate-600 transition-all"><SparklesIcon className="w-5 h-5" />{isLoading ? 'Gerando Prompt...' : 'Gerar Prompt de Imagem'}</button>
                            </form>
                        )}
                        {activeTab === 'image-edit' && (
                            <form onSubmit={handleImageEditPromptSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="edit-image-upload" className="block text-sm font-medium text-slate-300">1. Suba a imagem para editar:</label>
                                    <input id="edit-image-upload" type="file" accept="image/*" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null, 'editImage')} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100" />
                                    {editImagePreview && <img src={editImagePreview} alt="Pré-visualização para Edição" className="w-full h-48 object-contain rounded-lg mt-2 bg-black/20" />}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center"><label htmlFor="edit-image-prompt" className="block text-sm font-medium text-slate-300">2. O que você quer fazer?</label><IdeaButton /></div>
                                    <textarea id="edit-image-prompt" value={editImagePrompt} onChange={(e) => setEditImagePrompt(e.target.value)} placeholder="Ex: adicione um chapéu de pirata, mude o fundo para uma praia, me transforme em um desenho animado" className="w-full h-24 p-3 bg-slate-800 border border-slate-700 rounded-md resize-none focus:ring-2 focus:ring-cyan-500 transition" disabled={isLoading} />
                                </div>
                                <button type="submit" disabled={isLoading || !editImageFile || !editImagePrompt.trim()} className="w-full flex items-center justify-center gap-2 bg-cyan-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-cyan-700 disabled:bg-slate-600 transition-all"><SparklesIcon className="w-5 h-5" />{isLoading ? 'Gerando Prompt...' : 'Gerar Prompt de Edição'}</button>
                            </form>
                        )}
                        {activeTab === 'video' && (<form onSubmit={handleVideoSubmit} className="space-y-2"><div className="flex justify-between items-center"><label htmlFor="video-idea-input" className="block text-sm font-medium text-slate-300">Descreva a cena do vídeo:</label><IdeaButton /></div><textarea id="video-idea-input" value={videoIdea} onChange={(e) => setVideoIdea(e.target.value)} placeholder="Ex: um gato holográfico dirigindo um carro..." className="w-full h-32 p-3 bg-slate-800 border border-slate-700 rounded-md resize-none focus:ring-2 focus:ring-cyan-500 transition" disabled={isLoading} aria-label="Descreva sua ideia para o vídeo" /><button type="submit" disabled={isLoading || !videoIdea.trim()} className="w-full flex items-center justify-center gap-2 bg-cyan-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-cyan-700 disabled:bg-slate-600 transition-all !mt-4"><SparklesIcon className="w-5 h-5" />{isLoading ? 'Criando Roteiro...' : 'Gerar Prompt de Vídeo'}</button></form>)}
                        {activeTab === 'remix' && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="space-y-2">
                                    <label htmlFor="remix-video-upload" className="block text-sm font-medium text-slate-300">1. Suba o vídeo para remixar (até 30s):</label>
                                    <input id="remix-video-upload" type="file" accept="video/*" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null, 'remix')} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100" />
                                    {remixVideoPreview && <video src={remixVideoPreview} controls className="w-full rounded-lg mt-2 max-h-60"></video>}
                                </div>
                                {remixVideoFile && (
                                    <div className="space-y-4">
                                        <InfluencerStudio forRemix={true} />
                                        <RadioPillGroup label="2. Qual o seu objetivo com este Remix?">
                                            <RadioPill name="remix-goal" value="views" checked={remixGoal === 'views'} onChange={() => setRemixGoal('views')} label="Mais Visualizações" />
                                            <RadioPill name="remix-goal" value="interaction" checked={remixGoal === 'interaction'} onChange={() => setRemixGoal('interaction')} label="Mais Interação" />
                                            <RadioPill name="remix-goal" value="followers" checked={remixGoal === 'followers'} onChange={() => setRemixGoal('followers')} label="Mais Seguidores" />
                                        </RadioPillGroup>
                                        <button type="button" onClick={handleGenerateRemix} disabled={isRemixLoading} className="w-full flex items-center justify-center gap-2 bg-cyan-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-cyan-700 disabled:bg-slate-600 transition-all">
                                            <SparklesIcon className="w-5 h-5" /> {isRemixLoading ? 'Gerando Ideia...' : '3. Gerar Ideia de Remix'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'analysis' && (
                            <form onSubmit={(e) => e.preventDefault()} className="space-y-6 animate-fade-in">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-300">1. Escolha a plataforma e seu usuário:</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <select value={analysisPlatform} onChange={(e) => setAnalysisPlatform(e.target.value)} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition">
                                            {SOCIAL_MEDIA_PLATFORMS.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                                        </select>
                                        <input type="text" value={analysisUsername} onChange={(e) => setAnalysisUsername(e.target.value)} placeholder="@seu_usuario" className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <RadioPillGroup label="2. Qual seu principal objetivo agora?">
                                        {ANALYSIS_GOALS.map(goal => <RadioPill key={goal.id} name="analysis-goal" value={goal.id} checked={analysisGoal === goal.id} onChange={() => setAnalysisGoal(goal.id)} label={goal.name} />)}
                                    </RadioPillGroup>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="analysis-screenshots" className="block text-sm font-medium text-slate-300">3. Suba prints do seu perfil (feed, métricas, etc):</label>
                                    <input id="analysis-screenshots" type="file" accept="image/*" multiple onChange={(e) => setAnalysisScreenshots(Array.from(e.target.files || []))} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100" />
                                </div>
                                <button type="button" onClick={handleInitialAnalysis} disabled={isAnalysisLoading || !analysisUsername.trim() || analysisScreenshots.length === 0} className="w-full flex items-center justify-center gap-2 bg-cyan-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-cyan-700 disabled:bg-slate-600 transition-all !mt-8">
                                    <ChartBarIcon className="w-5 h-5" /> {isAnalysisLoading ? 'Analisando Perfil...' : 'Analisar Meu Perfil'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {(isLoading || generatedPrompt || error) && (
                    <div className="mt-8 animate-fade-in">
                        <h2 className="text-lg font-semibold text-slate-200 mb-3">Seu Prompt Gerado:</h2>
                        <div className="relative min-h-[150px] bg-slate-800 border border-slate-700 rounded-lg p-4">
                            {isLoading && (<div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 backdrop-blur-sm rounded-lg"><div className="flex flex-col items-center gap-2"><div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div><span className="text-slate-300">Aguarde, a mágica está acontecendo...</span></div></div>)}
                            {error && <p className="text-red-400">{error}</p>}
                            {generatedPrompt && (<><button onClick={() => handleCopyToClipboard(generatedPrompt, 'main_prompt')} className="absolute top-2 right-2 p-2 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400" aria-label="Copiar para a área de transferência">{copiedIdentifier === 'main_prompt' ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5 text-slate-400" />}</button><pre className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed font-sans">{generatedPrompt}</pre></>)}
                        </div>

                        {generatedPrompt && !isLoading && currentAIModel?.url && (
                            <div className="mt-4 space-y-4">
                                {activeTab === 'video' && !showContinueUI && (
                                    <button onClick={() => setShowContinueUI(true)} className="w-full flex items-center justify-center gap-2 text-cyan-400 font-semibold py-2 px-4 rounded-md hover:bg-slate-700 transition-all">
                                        <PlusCircleIcon className="w-5 h-5" />
                                        Gostou? Quer continuar a história?
                                    </button>
                                )}
                                {activeTab === 'video' && showContinueUI && (
                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
                                        <RadioPillGroup label="Mais quantos segundos?">
                                            {VIDEO_DURATIONS.slice(0, 3).map(d => <RadioPill key={d} name="additional-duration" value={d} checked={additionalDuration === d} onChange={() => setAdditionalDuration(d)} label={`${d}s`} />)}
                                        </RadioPillGroup>
                                        <button onClick={handleContinueStory} disabled={isContinuationLoading} className="w-full flex items-center justify-center gap-2 bg-cyan-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-cyan-700 disabled:bg-slate-600 transition-all">
                                            {isContinuationLoading ? 'Continuando...' : 'Continuar História'}
                                        </button>
                                    </div>
                                )}
                                <a href={currentAIModel.url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-md hover:bg-slate-600 transition-all">
                                    <ExternalLinkIcon className="w-5 h-5" />
                                    Abrir {currentAIModel.name}
                                </a>
                                {activeTab === 'video' && (
                                    <>
                                        <div>
                                            <label htmlFor="platform-selector" className="block text-sm font-medium text-slate-300 mb-2">Gerar legendas para qual plataforma?</label>
                                            <select id="platform-selector" value={socialPlatform} onChange={(e) => setSocialPlatform(e.target.value)} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition">
                                                {SOCIAL_MEDIA_PLATFORMS.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                                            </select>
                                        </div>
                                        <button onClick={handleGenerateCaptions} disabled={isCaptionsLoading} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-indigo-700 disabled:bg-slate-600 transition-all"><MegaphoneIcon className="w-5 h-5" />{isCaptionsLoading ? 'Gerando Legendas...' : 'Gerar Legendas e Hashtags'}</button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {(isRemixLoading || generatedRemixScript || remixError) && (
                    <div className="mt-8 animate-fade-in">
                        <h2 className="text-lg font-semibold text-slate-200 mb-3">Roteiro do Remix:</h2>
                        <div className="relative min-h-[150px] bg-slate-800 border border-slate-700 rounded-lg p-4">
                            {isRemixLoading && (<div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 backdrop-blur-sm rounded-lg"><div className="flex flex-col items-center gap-2"><div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div><span className="text-slate-300">Analisando e criando...</span></div></div>)}
                            {remixError && <p className="text-red-400">{remixError}</p>}
                            {generatedRemixScript && (
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-cyan-300 mb-1">Roteiro da Narração:</h3>
                                        <p className="text-slate-300 whitespace-pre-wrap text-sm font-sans">{generatedRemixScript.roteiro_narracao}</p>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-cyan-300 mb-1">Instruções de Filmagem:</h3>
                                        <p className="text-slate-300 whitespace-pre-wrap text-sm font-sans">{generatedRemixScript.instrucoes_remix}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {(isAnalysisLoading || initialAnalysis || analysisError) && (
                    <div className="mt-8 animate-fade-in">
                        <h2 className="text-lg font-semibold text-slate-200 mb-3">Análise Estratégica para @{analysisUsername}:</h2>
                        <div className="relative min-h-[150px] bg-slate-800 border border-slate-700 rounded-lg p-4">
                            {isAnalysisLoading && !actionPlan && (<div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 backdrop-blur-sm rounded-lg"><div className="flex flex-col items-center gap-2"><div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div><span className="text-slate-300">Analisando...</span></div></div>)}
                            {analysisError && <p className="text-red-400">{analysisError}</p>}
                            {initialAnalysis && (
                                <div className="space-y-6">
                                    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                                        <h3 className="font-semibold text-cyan-300 mb-2">Pontos Fortes</h3>
                                        <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">{initialAnalysis.pontos_fortes.map((item, i) => <li key={i}>{item}</li>)}</ul>
                                    </div>
                                    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                                        <h3 className="font-semibold text-yellow-300 mb-2">Pontos a Melhorar (A Verdade)</h3>
                                        <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">{initialAnalysis.pontos_a_melhorar.map((item, i) => <li key={i}>{item}</li>)}</ul>
                                    </div>
                                    {!actionPlan && !isAnalysisLoading && (
                                        <button onClick={handleGenerateActionPlan} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-indigo-700 transition-all">
                                            <ClipboardCheckIcon className="w-5 h-5" />
                                            Quero o Plano de Mudanças
                                        </button>
                                    )}
                                    {isAnalysisLoading && actionPlan && (<div className="flex items-center justify-center"><div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div></div>)}
                                    {actionPlan && (
                                        <>
                                            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                                                <h3 className="font-semibold text-green-300 mb-2">Plano de Ação</h3>
                                                <ul className="space-y-2 text-slate-300 text-sm">{actionPlan.plano_de_acao.map((item) => <li key={item.passo}><strong>Passo {item.passo}:</strong> {item.acao}</li>)}</ul>
                                            </div>
                                            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                                                <h3 className="font-semibold text-green-300 mb-2">Sugestão de Conteúdo Viral</h3>
                                                <p className="text-slate-100 text-sm font-medium"><strong>Ideia:</strong> {actionPlan.sugestao_de_conteudo_viral.ideia}</p>
                                                <p className="text-slate-300 text-sm mt-1"><strong>Formato:</strong> {actionPlan.sugestao_de_conteudo_viral.formato}</p>
                                                <p className="text-slate-300 text-sm mt-1"><strong>Roteiro:</strong> {actionPlan.sugestao_de_conteudo_viral.roteiro_sugerido}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {(isCaptionsLoading || generatedCaptions || captionsError) && (
                    <div className="mt-8 animate-fade-in">
                        <h2 className="text-lg font-semibold text-slate-200 mb-3">Legendas para {SOCIAL_MEDIA_PLATFORMS.find(p => p.id === socialPlatform)?.name}:</h2>
                        <div className="relative min-h-[150px] bg-slate-800 border border-slate-700 rounded-lg p-4">
                            {isCaptionsLoading && (<div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 backdrop-blur-sm rounded-lg"><div className="flex flex-col items-center gap-2"><div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div><span className="text-slate-300">Criando conteúdo viral...</span></div></div>)}
                            {captionsError && <p className="text-red-400">{captionsError}</p>}
                            {generatedCaptions && (
                                <div className="space-y-6">
                                    {generatedCaptions.map(cap => (
                                        <div key={cap.variacao} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 relative">
                                            <h3 className="font-semibold text-cyan-300 mb-2">Variação {cap.variacao}</h3>
                                            <p className="text-slate-300"><strong className="text-slate-100">Gancho:</strong> {cap.gancho}</p>
                                            <p className="text-slate-300 mt-1"><strong className="text-slate-100">Desenvolvimento:</strong> {cap.desenvolvimento}</p>
                                            <p className="text-slate-300 mt-1"><strong className="text-slate-100">CTA:</strong> {cap.cta}</p>
                                            <p className="text-indigo-300 mt-3 text-sm break-words">{cap.hashtags}</p>
                                            <button onClick={() => handleCopyToClipboard(`${cap.gancho}\n\n${cap.desenvolvimento}\n\n${cap.cta}\n\n${cap.hashtags}`, `caption_${cap.variacao}`)} className="absolute top-2 right-2 p-2 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400" aria-label="Copiar legenda completa">
                                                {copiedIdentifier === `caption_${cap.variacao}` ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5 text-slate-400" />}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {generatedCaptions && !isCaptionsLoading && currentSocialPlatform?.url && (
                            <a href={currentSocialPlatform.url} target="_blank" rel="noopener noreferrer" className="mt-4 w-full flex items-center justify-center gap-2 bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-md hover:bg-slate-600 transition-all">
                                <ExternalLinkIcon className="w-5 h-5" />
                                Publicar no {currentSocialPlatform.name}
                            </a>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
