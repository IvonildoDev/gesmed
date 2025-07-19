import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    Alert,
    Switch
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/pt-br';
import database from '../src/database/database';
import {
    playMedicationAlarmSound,
    getSoundConfig,
    muteSoundTemporarily,
    isSoundMuted
} from '../services/SoundService';

export default function ProximasDosesScreen({ route, navigation }) {
    const { usuarioId } = route.params;
    const [nomeUsuario, setNomeUsuario] = useState('');
    const [proximasDoses, setProximasDoses] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [filtro, setFiltro] = useState('todos'); // 'todos', 'hoje', 'semana'
    const [alarmePlayed, setAlarmePlayed] = useState(false); // Flag para controlar se o alarme já tocou

    useEffect(() => {
        carregarDados();

        // Configurar atualização quando a tela receber foco
        const unsubscribe = navigation.addListener('focus', () => {
            carregarDados();
        });

        return unsubscribe;
    }, [navigation]);

    const carregarDados = async () => {
        setRefreshing(true);
        try {
            carregarDadosUsuario();
            carregarProximasDoses();
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setRefreshing(false);
        }
    };

    const carregarDadosUsuario = () => {
        try {
            const usuario = database.getUserById(usuarioId);
            if (usuario) {
                setNomeUsuario(usuario.nome_usuario);
            }
        } catch (error) {
            console.error("Erro ao carregar dados do usuário:", error);
        }
    };

    const carregarProximasDoses = () => {
        try {
            // Obter todos os medicamentos do usuário
            const medicamentos = database.getMedicamentosByUsuario(usuarioId);

            // Filtrar apenas medicamentos com próxima dose definida
            const medicamentosComProximaDose = medicamentos.filter(med => med.proxima_dose);

            // Criar um array de doses (pode ter múltiplas doses para o mesmo medicamento)
            let doses = [];

            medicamentosComProximaDose.forEach(medicamento => {
                // Adicionar próxima dose
                if (medicamento.proxima_dose) {
                    doses.push({
                        id: `${medicamento.id}-proxima`,
                        medicamentoId: medicamento.id,
                        nome: medicamento.nome,
                        dosagem: medicamento.dosagem,
                        data: new Date(medicamento.proxima_dose),
                        intervalo: medicamento.intervalo_horas,
                        observacoes: medicamento.observacoes
                    });

                    // Calcular doses futuras baseadas no intervalo e total de doses
                    const intervaloHoras = medicamento.intervalo_horas;

                    // Buscar quantas doses já foram tomadas deste medicamento
                    const historico = database.getAllSync(
                        "SELECT COUNT(*) as total FROM historico WHERE medicamento_id = ?",
                        [medicamento.id]
                    );
                    const dosesDosesTomadas = historico[0]?.total || 0;

                    // Calcular quantas doses restantes devem ser mostradas e verificar se o campo total_doses existe e tem um valor válido
                    const totalDoses = parseInt(medicamento.total_doses) || 0;

                    let dosesRestantes;

                    if (totalDoses <= 0) {
                        // Se é um medicamento contínuo (total_doses = 0), mostrar 5 doses como antes
                        dosesRestantes = 5;
                        console.log(`[${medicamento.nome}] Medicamento contínuo: mostrando 5 doses`);
                    } else {
                        // Se tem total de doses definido, mostrar apenas as doses restantes
                        // Subtraímos 1 porque a próxima dose já está contada acima
                        dosesRestantes = Math.max(0, totalDoses - dosesDosesTomadas - 1);
                        console.log(`[${medicamento.nome}] Total: ${totalDoses}, Tomadas: ${dosesDosesTomadas}, Restantes a mostrar: ${dosesRestantes}`);
                    }

                    if (intervaloHoras > 0 && dosesRestantes > 0) {
                        // Adicionar apenas o número necessário de doses futuras
                        let ultimaData = new Date(medicamento.proxima_dose);
                        for (let i = 0; i < dosesRestantes; i++) {
                            ultimaData = new Date(ultimaData.getTime() + intervaloHoras * 60 * 60 * 1000);
                            doses.push({
                                id: `${medicamento.id}-futura-${i}`,
                                medicamentoId: medicamento.id,
                                nome: medicamento.nome,
                                dosagem: medicamento.dosagem,
                                data: new Date(ultimaData),
                                intervalo: intervaloHoras,
                                observacoes: medicamento.observacoes
                            });
                        }
                    }
                }
            });

            // Ordenar por data (mais próxima primeiro)
            doses.sort((a, b) => a.data - b.data);

            setProximasDoses(doses);
        } catch (error) {
            console.error("Erro ao carregar próximas doses:", error);
            Alert.alert("Erro", "Não foi possível carregar as próximas doses.");
        }
    };

    const formatarData = (data) => {
        moment.locale('pt-br');
        return moment(data).format('DD [de] MMMM [de] YYYY');
    };

    const formatarHora = (data) => {
        return moment(data).format('HH:mm');
    };

    const formatarIntervalo = (horas) => {
        if (!horas) return "Dose única";
        return `${horas} em ${horas} horas`;
    };

    const ehHoje = (data) => {
        const hoje = new Date();
        return (
            data.getDate() === hoje.getDate() &&
            data.getMonth() === hoje.getMonth() &&
            data.getFullYear() === hoje.getFullYear()
        );
    };

    const ehEstaSemana = (data) => {
        const hoje = new Date();
        const umaSemanaDepois = new Date(hoje);
        umaSemanaDepois.setDate(umaSemanaDepois.getDate() + 7);
        return data >= hoje && data <= umaSemanaDepois;
    };

    const dosesFiltradas = () => {
        switch (filtro) {
            case 'hoje':
                return proximasDoses.filter(dose => ehHoje(dose.data));
            case 'semana':
                return proximasDoses.filter(dose => ehEstaSemana(dose.data));
            default:
                return proximasDoses;
        }
    };

    const [advanceWarningMinutes, setAdvanceWarningMinutes] = useState(30);
    const [soundIsMuted, setSoundIsMuted] = useState(false);

    // Carregar configurações de som
    useEffect(() => {
        const loadSoundConfig = async () => {
            const config = await getSoundConfig();
            setAdvanceWarningMinutes(config.advanceWarning);

            const muted = await isSoundMuted();
            setSoundIsMuted(muted);
        };

        loadSoundConfig();
    }, []);

    // Função para verificar se o medicamento deve tocar o alarme (próximo de ser tomado)
    const verificarAlarme = (data) => {
        const agora = new Date();
        const minutosAteADose = (data - agora) / (1000 * 60);
        return minutosAteADose <= advanceWarningMinutes && minutosAteADose >= -5; // Dentro do tempo configurado no futuro ou 5 min passados
    };

    // Função para tocar o alarme uma única vez quando houver medicamentos na hora
    useEffect(() => {
        const checkAndPlayAlarm = async () => {
            // Verificar se o som está silenciado
            const muted = await isSoundMuted();
            setSoundIsMuted(muted);

            if (muted) return; // Se estiver silenciado, não tocar o alarme

            const medicamentosNaHora = proximasDoses.some(dose => verificarAlarme(dose.data));

            if (medicamentosNaHora && !alarmePlayed) {
                // Tocar o alarme apenas uma vez ao carregar medicamentos na hora
                playMedicationAlarmSound({}); // Usar as configurações salvas
                setAlarmePlayed(true);

                // Resetar a flag após 1 minuto para permitir um novo som se o usuário continuar na tela
                setTimeout(() => {
                    setAlarmePlayed(false);
                }, 60000);

                // Mostrar um alerta sobre medicamentos na hora com opção de silenciar
                Alert.alert(
                    "Atenção",
                    "Você tem medicamentos próximos do horário de serem tomados!",
                    [
                        { text: "OK" },
                        {
                            text: "Silenciar por 30 min",
                            onPress: async () => {
                                await muteSoundTemporarily(30);
                                setSoundIsMuted(true);
                            }
                        }
                    ]
                );
            }
        };

        checkAndPlayAlarm();
    }, [proximasDoses]);

    const renderItem = ({ item }) => {
        const isHoje = ehHoje(item.data);
        const dataFormatada = formatarData(item.data);
        const horaFormatada = formatarHora(item.data);
        const deveTocarAlarme = verificarAlarme(item.data);

        // Função para marcar medicamento como tomado
        const marcarComoTomado = () => {
            Alert.alert(
                "Marcar como Tomado",
                `Marcar dose de ${item.nome} às ${horaFormatada} como tomada?`,
                [
                    { text: "Cancelar", style: "cancel" },
                    {
                        text: "Confirmar",
                        style: "default",
                        onPress: async () => {
                            try {
                                // Verificar se é a próxima dose do medicamento (e não uma dose futura calculada)
                                const medicamento = database.getMedicamentoById(item.medicamentoId);

                                if (!medicamento) {
                                    Alert.alert('Erro', 'Medicamento não encontrado');
                                    return;
                                }

                                // Se for a próxima dose real, navegar para a tela de medicamentos para marcar como tomado
                                navigation.navigate('MedicamentosTab', {
                                    medicamentoId: item.medicamentoId,
                                    usuarioId: usuarioId,
                                    marcarTomado: true
                                });
                            } catch (error) {
                                console.error("Erro ao marcar medicamento como tomado:", error);
                                Alert.alert("Erro", "Não foi possível marcar o medicamento como tomado.");
                            }
                        }
                    }
                ]
            );
        };

        // Função para excluir uma dose específica
        const excluirDose = () => {
            Alert.alert(
                "Excluir Dose",
                `Tem certeza que deseja excluir a dose de ${item.nome} às ${horaFormatada}?`,
                [
                    { text: "Cancelar", style: "cancel" },
                    {
                        text: "Excluir",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                // Verificar se é a próxima dose do medicamento (não uma dose futura calculada)
                                const medicamento = database.getMedicamentoById(item.medicamentoId);

                                if (medicamento) {
                                    // Comparar se é a próxima dose (proxima_dose) e não uma dose calculada
                                    const proximaDoseData = new Date(medicamento.proxima_dose);
                                    const itemData = new Date(item.data);

                                    // Se for a próxima dose real, atualizamos o medicamento
                                    if (proximaDoseData.getTime() === itemData.getTime()) {
                                        database.updateMedicamento({
                                            ...medicamento,
                                            proxima_dose: null
                                        });

                                        // Recarregar dados
                                        carregarDados();
                                        Alert.alert("Sucesso", `A dose de ${item.nome} foi excluída.`);
                                    } else {
                                        // Para doses calculadas, informamos que não é possível excluir
                                        Alert.alert(
                                            "Informação",
                                            "Esta é uma dose futura calculada com base no intervalo. Apenas a próxima dose pode ser excluída."
                                        );
                                    }
                                }
                            } catch (error) {
                                console.error("Erro ao excluir dose:", error);
                                Alert.alert("Erro", "Não foi possível excluir a dose.");
                            }
                        }
                    }
                ]
            );
        };

        return (
            <View style={[
                styles.itemDose,
                isHoje && styles.itemDoseHoje,
                deveTocarAlarme && styles.itemDoseAlarme
            ]}>
                <View style={styles.itemHeader}>
                    <View style={[styles.iconContainer, deveTocarAlarme && styles.iconContainerAlarme]}>
                        <Ionicons
                            name={deveTocarAlarme ? "alarm" : (isHoje ? "alarm-outline" : "calendar")}
                            size={22}
                            color={deveTocarAlarme ? "#ff0000" : (isHoje ? "#ff9800" : "#007bff")}
                        />
                    </View>
                    <View style={styles.titleContainer}>
                        <Text style={[styles.nomeMedicamento, deveTocarAlarme && styles.nomeMedicamentoAlarme]}>
                            {item.nome} {deveTocarAlarme && <Text style={styles.alarmeIndicator}>🔔</Text>}
                        </Text>

                        {/* Mostrar informações sobre doses restantes se aplicável */}
                        {(() => {
                            // Buscar informações do medicamento para ter o total de doses
                            const medicamento = database.getMedicamentoById(item.medicamentoId);
                            if (medicamento && medicamento.total_doses > 0) {
                                const historico = database.getAllSync(
                                    "SELECT COUNT(*) as total FROM historico WHERE medicamento_id = ?",
                                    [item.medicamentoId]
                                );
                                const dosesDosesTomadas = historico[0]?.total || 0;
                                const totalDoses = medicamento.total_doses;
                                const dosesRestantes = Math.max(0, totalDoses - dosesDosesTomadas);

                                if (item.id.includes("-proxima")) {  // Para a próxima dose real
                                    return (
                                        <Text style={styles.doseStatusText}>
                                            {dosesRestantes > 0
                                                ? `${dosesRestantes} ${dosesRestantes === 1 ? 'dose restante' : 'doses restantes'} de ${totalDoses}`
                                                : 'Última dose do tratamento!'}
                                        </Text>
                                    );
                                } else {
                                    // Para doses calculadas futuras, verificar se ainda faz parte do tratamento
                                    const idNumero = parseInt(item.id.split('-futura-')[1]);
                                    if (idNumero < dosesRestantes - 1) {
                                        // Esta dose ainda faz parte do tratamento
                                        return (
                                            <Text style={styles.doseStatusText}>
                                                Dose {dosesDosesTomadas + 2 + idNumero} de {totalDoses}
                                            </Text>
                                        );
                                    }
                                }
                            }
                            return null;
                        })()}
                    </View>

                    {/* Botões de ação */}
                    <View style={styles.actionButtonsContainer}>
                        {/* Botão de marcar como tomado */}
                        <TouchableOpacity
                            style={styles.takenButton}
                            onPress={marcarComoTomado}
                        >
                            <Ionicons name="checkmark-circle-outline" size={20} color="#28a745" />
                        </TouchableOpacity>

                        {/* Botão de excluir dose */}
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={excluirDose}
                        >
                            <Ionicons name="trash-outline" size={20} color="#dc3545" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.infoContainer}>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Dosagem:</Text>
                        <Text style={styles.infoValue}>{item.dosagem}</Text>
                    </View>

                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Data:</Text>
                        <Text style={styles.infoValue}>{dataFormatada}</Text>
                    </View>

                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Hora:</Text>
                        <Text style={[styles.infoValue, isHoje && styles.infoValueDestaque]}>{horaFormatada}</Text>
                    </View>

                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Intervalo:</Text>
                        <Text style={styles.infoValue}>{formatarIntervalo(item.intervalo)}</Text>
                    </View>

                    {item.observacoes ? (
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Observações:</Text>
                            <Text style={styles.infoValue}>{item.observacoes}</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.cardButtonsContainer}>
                    <TouchableOpacity
                        style={styles.tomarButton}
                        onPress={marcarComoTomado}
                    >
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.tomarButtonText}>Marcar como Tomado</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.irParaMedicamentoButton}
                        onPress={() => navigation.navigate('MedicationDetails', {
                            medicamentoId: item.medicamentoId
                        })}
                    >
                        <Ionicons name="search" size={18} color="#fff" />
                        <Text style={styles.irParaMedicamentoText}>Informações</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderFiltros = () => {
        return (
            <View style={styles.filtrosContainer}>
                <TouchableOpacity
                    style={[styles.filtroButton, filtro === 'todos' && styles.filtroButtonActive]}
                    onPress={() => setFiltro('todos')}
                >
                    <Text style={[styles.filtroText, filtro === 'todos' && styles.filtroTextActive]}>Todos</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filtroButton, filtro === 'hoje' && styles.filtroButtonActive]}
                    onPress={() => setFiltro('hoje')}
                >
                    <Text style={[styles.filtroText, filtro === 'hoje' && styles.filtroTextActive]}>Hoje</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filtroButton, filtro === 'semana' && styles.filtroButtonActive]}
                    onPress={() => setFiltro('semana')}
                >
                    <Text style={[styles.filtroText, filtro === 'semana' && styles.filtroTextActive]}>Esta semana</Text>
                </TouchableOpacity>
            </View>
        );
    };

    // A função para excluir todas as doses foi removida e substituída por controles individuais em cada card

    // Função para silenciar ou reativar os sons
    const toggleSoundMute = async () => {
        if (soundIsMuted) {
            // Remover o silenciamento
            await muteSoundTemporarily(0); // 0 minutos = remover mudo
            setSoundIsMuted(false);
            Alert.alert("Som Ativado", "Os alertas sonoros foram reativados.");
        } else {
            // Mostrar opções de tempo para silenciar
            Alert.alert(
                "Silenciar Alarmes",
                "Por quanto tempo deseja silenciar os alarmes?",
                [
                    {
                        text: "15 minutos",
                        onPress: async () => {
                            await muteSoundTemporarily(15);
                            setSoundIsMuted(true);
                        }
                    },
                    {
                        text: "30 minutos",
                        onPress: async () => {
                            await muteSoundTemporarily(30);
                            setSoundIsMuted(true);
                        }
                    },
                    {
                        text: "1 hora",
                        onPress: async () => {
                            await muteSoundTemporarily(60);
                            setSoundIsMuted(true);
                        }
                    },
                    {
                        text: "Cancelar",
                        style: "cancel"
                    }
                ]
            );
        }
    };

    return (
        <View style={styles.container}>
            {/* Controle de silenciamento */}
            <View style={styles.soundControlContainer}>
                <View style={styles.soundControlLeft}>
                    <Ionicons
                        name={soundIsMuted ? "volume-mute" : "volume-high"}
                        size={22}
                        color={soundIsMuted ? "#999" : "#007bff"}
                    />
                    <Text style={styles.soundControlText}>
                        {soundIsMuted ? "Alertas silenciados" : "Alertas sonoros ativos"}
                    </Text>
                </View>
                <View style={styles.soundControlRight}>
                    <Switch
                        value={!soundIsMuted}
                        onValueChange={toggleSoundMute}
                        trackColor={{ false: '#e0e0e0', true: '#cce5ff' }}
                        thumbColor={!soundIsMuted ? "#007bff" : "#999"}
                    />
                    <TouchableOpacity
                        style={styles.configButton}
                        onPress={() => navigation.navigate('SoundConfig')}
                    >
                        <Ionicons name="settings-outline" size={22} color="#007bff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* O botão para excluir todas as doses foi substituído por botões individuais em cada card */}

            {renderFiltros()}

            {proximasDoses.length > 0 ? (
                <FlatList
                    data={dosesFiltradas()}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={carregarDados}
                            colors={['#007bff']}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={70} color="#ddd" />
                            <Text style={styles.emptyText}>
                                {filtro === 'todos'
                                    ? 'Nenhuma dose agendada'
                                    : filtro === 'hoje'
                                        ? 'Nenhuma dose para hoje'
                                        : 'Nenhuma dose para esta semana'}
                            </Text>
                        </View>
                    }
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>Nenhuma próxima dose cadastrada</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        padding: 16,
    },
    soundControlContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    soundControlLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    soundControlRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    configButton: {
        marginLeft: 15,
        padding: 5,
    },
    soundControlText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#555',
        marginLeft: 8,
    },
    // Os estilos para o botão de excluir todas foram removidos
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginTop: 16,
    },
    listContainer: {
        paddingBottom: 20,
    },
    filtrosContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        backgroundColor: '#fff',
        borderRadius: 25,
        padding: 4,
        elevation: 2,
    },
    filtroButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 20,
    },
    filtroButtonActive: {
        backgroundColor: '#007bff',
    },
    filtroText: {
        color: '#555',
        fontWeight: '500',
    },
    filtroTextActive: {
        color: '#fff',
    },
    itemDose: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    itemDoseHoje: {
        borderLeftWidth: 4,
        borderLeftColor: '#ff9800',
    },
    itemDoseAlarme: {
        borderLeftWidth: 4,
        borderLeftColor: '#ff0000',
        backgroundColor: '#ffe6e6',
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f0f9ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    iconContainerAlarme: {
        backgroundColor: '#ffe6e6',
    },
    titleContainer: {
        flex: 1,
        flexDirection: 'column',
    },
    nomeMedicamento: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    nomeMedicamentoAlarme: {
        color: '#ff0000',
    },
    doseStatusText: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
        fontStyle: 'italic',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deleteButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#fff2f2',
    },
    takenButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#e8f5e9',
    },
    alarmeIndicator: {
        fontSize: 16,
        marginLeft: 5,
    },
    infoContainer: {
        marginBottom: 12,
    },
    infoItem: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    infoLabel: {
        width: 100,
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    infoValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    infoValueDestaque: {
        color: '#ff9800',
        fontWeight: 'bold',
    },
    cardButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        gap: 10,
    },
    tomarButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#28a745',
        borderRadius: 25,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tomarButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 5,
    },
    irParaMedicamentoButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#007bff',
        borderRadius: 25,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    irParaMedicamentoText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 5,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 10,
        textAlign: 'center',
    },
});
