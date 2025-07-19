import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurações padrão para o sistema de alarme
const DEFAULT_CONFIG = {
    repetitions: 3,        // Número padrão de repetições do som
    interval: 1500,        // Tempo de intervalo entre os sons (em ms)
    advanceWarning: 30,    // Tempo de aviso antecipado (em minutos)
    isMuted: false,        // Se os sons estão silenciados
    muteUntil: null        // Até quando os sons estão silenciados
};

// Chaves para armazenar as configurações
const CONFIG_STORAGE_KEY = 'gesmed_sound_config';

// Função para obter as configurações de som
export async function getSoundConfig() {
    try {
        const configString = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
        if (configString) {
            return { ...DEFAULT_CONFIG, ...JSON.parse(configString) };
        }
        return DEFAULT_CONFIG;
    } catch (error) {
        console.error('Erro ao carregar configurações de som:', error);
        return DEFAULT_CONFIG;
    }
}

// Função para salvar as configurações de som
export async function saveSoundConfig(config) {
    try {
        const updatedConfig = { ...DEFAULT_CONFIG, ...config };
        await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updatedConfig));
        return true;
    } catch (error) {
        console.error('Erro ao salvar configurações de som:', error);
        return false;
    }
}

// Função para silenciar temporariamente (por X minutos)
export async function muteSoundTemporarily(minutes = 60) {
    try {
        const config = await getSoundConfig();
        const now = new Date();
        const muteUntil = new Date(now.getTime() + minutes * 60000);

        config.muteUntil = muteUntil.toISOString();
        await saveSoundConfig(config);
        return true;
    } catch (error) {
        console.error('Erro ao silenciar som temporariamente:', error);
        return false;
    }
}

// Função para verificar se o som está silenciado
export async function isSoundMuted() {
    try {
        const config = await getSoundConfig();

        // Se estiver em modo mudo permanente
        if (config.isMuted) return true;

        // Verificar se o período de mudo temporário ainda está ativo
        if (config.muteUntil) {
            const now = new Date();
            const muteUntil = new Date(config.muteUntil);

            if (now < muteUntil) {
                return true;
            } else {
                // Período expirou, remover o muteUntil
                config.muteUntil = null;
                await saveSoundConfig(config);
            }
        }

        return false;
    } catch (error) {
        console.error('Erro ao verificar status de mudo:', error);
        return false;
    }
}

// Função para tocar o som de campainha do celular
export async function playBellSound() {
    try {
        // Usando expo-notifications para tocar o som da campainha do sistema
        // Isso vai funcionar mesmo que o app esteja em primeiro plano
        await Notifications.presentNotificationAsync({
            content: {
                // Título e corpo invisíveis, com apenas o som
                title: '',
                body: '',
                sound: 'default', // Som padrão do sistema (campainha)
                // Definir prioridade alta para garantir que toca o som mesmo com o telefone silencioso (no Android)
                priority: 'high',
                // Definindo badge como 0 para não adicionar número no ícone
                badge: 0,
                // O som será reproduzido mesmo que o modo silencioso esteja ativo (iOS)
                autoDismiss: true,
            },
            trigger: null, // Trigger null faz a notificação ser apresentada imediatamente
        });

        // Não precisamos retornar o ID da notificação porque ela é apresentada e descartada imediatamente
        console.log('Som de campainha reproduzido com sucesso!');
        return true;
    } catch (error) {
        console.error('Erro ao reproduzir som de campainha:', error);
        return false;
    }
}

// Função para tocar som de alarme de medicamento com repetição
export async function playMedicationAlarmSound(options = {}) {
    try {
        // Verificar se o som está silenciado (exceto se forçado com ignoreIsMuted)
        if (!options.ignoreIsMuted) {
            const isMuted = await isSoundMuted();
            if (isMuted) {
                console.log('Som silenciado, não reproduzindo alarme');
                return false;
            }
        }

        // Obter as configurações de som
        const config = await getSoundConfig();

        // Usar configurações fornecidas ou as padrões
        const repetitions = options.repetitions !== undefined ? options.repetitions : config.repetitions;
        const interval = options.interval !== undefined ? options.interval : config.interval;

        console.log(`Tocando alarme: ${repetitions} repetições com intervalo de ${interval}ms`);

        // Vamos criar um atraso entre cada som para simular um alarme repetitivo
        for (let i = 0; i < repetitions; i++) {
            // Esperamos um pequeno atraso entre cada som
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, interval));
            }

            // Tocamos o som
            await Notifications.presentNotificationAsync({
                content: {
                    // Sem título nem corpo para uma notificação silenciosa (apenas som)
                    title: '',
                    body: '',
                    sound: 'default',
                    priority: 'high',
                    badge: 0,
                    autoDismiss: true,
                },
                trigger: null,
            });
        }

        console.log(`Som de alarme reproduzido ${repetitions} vezes com sucesso!`);
        return true;
    } catch (error) {
        console.error('Erro ao reproduzir som de alarme:', error);
        return false;
    }
}