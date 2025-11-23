export interface UserData {
    name: string;
    whatsapp: string;
    email: string;
}

export interface UsageData {
    [feature: string]: number;
}

const USER_DATA_KEY = 'codeprompt_user_data';
const USAGE_DATA_KEY = 'codeprompt_usage_data';

export const getUserData = (): UserData | null => {
    const data = localStorage.getItem(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
};

export const saveUserData = (data: UserData) => {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(data));
};

export const getUsageCount = (feature: string): number => {
    const data = localStorage.getItem(USAGE_DATA_KEY);
    const usage: UsageData = data ? JSON.parse(data) : {};
    return usage[feature] || 0;
};

export const incrementUsageCount = (feature: string) => {
    const data = localStorage.getItem(USAGE_DATA_KEY);
    const usage: UsageData = data ? JSON.parse(data) : {};
    usage[feature] = (usage[feature] || 0) + 1;
    localStorage.setItem(USAGE_DATA_KEY, JSON.stringify(usage));
};

export const hasReachedLimit = (feature: string): boolean => {
    return getUsageCount(feature) >= 1;
};
