import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { playBellSound, playMedicationAlarmSound } from './SoundService';

// Verificar se estamos rodando em Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Flag para controlar se já mostramos o alerta sobre Expo Go
let alertShown = false;

// Configurar o comportamento padrão das notificações
Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        // Verificar se é uma notificação de medicamento
        const isMedicationNotification = notification.request.content?.data?.medicamentoId;

        // Se for notificação de medicamento, tocar o som de alarme repetidamente
        if (isMedicationNotification) {
            // Vamos tocar o som de alarme repetidamente em paralelo
            playMedicationAlarmSound(3);
        }

        return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            sound: 'default', // Usar o som padrão do dispositivo
        };
    },
});

// Função para solicitar permissões
export async function requestNotificationsPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        return false;
    }

    // No Android, precisamos de um canal de notificação específico
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('medicamentos', {
            name: 'Lembretes de medicamentos',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default', // Som padrão do sistema
            lightColor: '#007BFF',
            showBadge: true,
        });
    }

    return true;
}

// Agendar notificação para um medicamento
export async function agendarNotificacaoMedicamento(medicamento) {
    const { id, nome, quantidade, proxima_dose } = medicamento;
    const trigger = new Date(proxima_dose);

    // Alertar sobre as limitações do Expo Go (apenas uma vez)
    if (Platform.OS === 'android' && isExpoGo && !alertShown) {
        Alert.alert(
            "Limitação de Notificações",
            "O Expo Go não suporta mais notificações push no Android a partir do SDK 53. Para usar notificações, será necessário criar um development build do aplicativo.",
            [{ text: "OK", onPress: () => { alertShown = true; } }]
        );
        // Ainda vamos tentar agendar, mas pode não funcionar no Android com Expo Go
    }

    // Só agendar se a data for futura
    if (trigger <= new Date()) {
        console.log('Data já passou, não agendando notificação');
        return null;
    }

    // Se a notificação for para menos de 10 segundos no futuro, tocar som imediatamente
    // Isso é útil para testes ou quando o app é aberto próximo ao horário do medicamento
    const timeUntilTrigger = trigger.getTime() - new Date().getTime();
    if (timeUntilTrigger > 0 && timeUntilTrigger <= 10000) {
        // Agendar o som para tocar quando a notificação for disparada
        setTimeout(() => {
            playMedicationAlarmSound(3); // Tocar o som 3 vezes quando for hora do medicamento
        }, timeUntilTrigger);
    }

    try {
        // Cancelar qualquer notificação existente para este medicamento
        await cancelarNotificacaoMedicamento(id);

        // Agendar nova notificação
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Hora de tomar seu medicamento!',
                body: `${nome} - ${quantidade}`,
                sound: 'default', // Som padrão do sistema
                priority: 'high',
                data: { medicamentoId: id },
            },
            trigger: {
                type: 'date',
                date: trigger,
            },
        });

        console.log(`Notificação agendada para ${trigger.toLocaleString()}, ID: ${notificationId}`);
        return notificationId;
    } catch (error) {
        console.error('Erro ao agendar notificação:', error);
        return null;
    }
}

// Cancelar uma notificação específica de um medicamento
export async function cancelarNotificacaoMedicamento(medicamentoId) {
    try {
        const notificacoes = await Notifications.getAllScheduledNotificationsAsync();
        const notificacaoMedicamento = notificacoes.find(
            notif => notif.content.data && notif.content.data.medicamentoId === medicamentoId
        );

        if (notificacaoMedicamento) {
            await Notifications.cancelScheduledNotificationAsync(notificacaoMedicamento.identifier);
            console.log(`Notificação cancelada para o medicamento ID: ${medicamentoId}`);
        }
    } catch (error) {
        console.error('Erro ao cancelar notificação:', error);
    }
}

// Verificar e agendar notificações para todos os medicamentos
export async function verificarEAgendarNotificacoes(medicamentos) {
    if (!medicamentos || !medicamentos.length) return;

    // Alertar sobre as limitações do Expo Go (apenas uma vez)
    if (Platform.OS === 'android' && isExpoGo && !alertShown) {
        Alert.alert(
            "Limitação de Notificações",
            "O Expo Go não suporta mais notificações push no Android a partir do SDK 53. Para usar notificações completamente, será necessário criar um development build do aplicativo.",
            [{ text: "OK", onPress: () => { alertShown = true; } }]
        );
    }

    const permissaoOk = await requestNotificationsPermissions();
    if (!permissaoOk) {
        console.log('Permissões de notificação não concedidas');
        return;
    }

    // Limpar notificações antigas
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Agendar novas notificações para cada medicamento
    for (const medicamento of medicamentos) {
        await agendarNotificacaoMedicamento(medicamento);
    }
}

// Para registrar um handler para quando o usuário toca em uma notificação
export function registrarListenerNotificacao(onNotificationResponse) {
    const subscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);
    return subscription;
}

// Função para testar o alarme sonoro de medicamento manualmente
export async function testarAlarmeManualmente(medicamentoNome = 'Medicamento de Teste') {
    try {
        // Tocar o som de alarme imediatamente
        await playMedicationAlarmSound(3);

        // Mostrar também uma notificação de teste
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Teste de Alarme',
                body: `Testando o alarme para: ${medicamentoNome}`,
                sound: 'default',
                priority: 'high',
                data: { isTeste: true },
            },
            trigger: null, // Trigger null faz a notificação ser apresentada imediatamente
        });

        return true;
    } catch (error) {
        console.error('Erro ao testar alarme manualmente:', error);
        return false;
    }
}
