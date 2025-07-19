import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, StyleSheet, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import database from '../src/database/database';

export default function HistoryScreen({ route, navigation }) {
    const { usuarioId } = route.params;
    const [historico, setHistorico] = useState([]);
    const [medicamentosAgendados, setMedicamentosAgendados] = useState([]);
    const [nomeUsuario, setNomeUsuario] = useState('');
    const [visualizacao, setVisualizacao] = useState('historico'); // 'historico' ou 'agendados'
    const [medicamentosSummary, setMedicamentosSummary] = useState([]); // Sumário de medicamentos e doses
    const [refreshing, setRefreshing] = useState(false); // Estado para controle do pull-to-refresh

    useEffect(() => {
        carregarDados();

        // Configurar atualização quando a tela receber foco
        const unsubscribe = navigation.addListener('focus', () => {
            carregarDados();
        });

        return unsubscribe;
    }, []);

    // Função para carregar todos os dados necessários
    const carregarDados = async () => {
        setRefreshing(true);
        try {
            await carregarDadosUsuario();
            await carregarHistorico();
            await carregarMedicamentosAgendados();
            await carregarSumarioMedicamentos();
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setRefreshing(false);
        }
    };

    // Função para carregar o sumário de doses tomadas e restantes para cada medicamento
    const carregarSumarioMedicamentos = () => {
        try {
            // Obter todos os medicamentos do usuário que têm total_doses > 0
            const medicamentos = database.getAllSync(
                "SELECT id, nome, total_doses FROM medicamentos WHERE usuario_id = ? AND total_doses > 0",
                [usuarioId]
            );

            // Para cada medicamento, contar quantas doses foram tomadas
            const sumario = medicamentos.map(med => {
                const historico = database.getAllSync(
                    "SELECT COUNT(*) as total FROM historico WHERE medicamento_id = ?",
                    [med.id]
                );
                const dosesTomadas = historico[0]?.total || 0;
                const dosesRestantes = Math.max(0, med.total_doses - dosesTomadas);
                const progresso = med.total_doses > 0 ? (dosesTomadas / med.total_doses) * 100 : 0;

                return {
                    id: med.id,
                    nome: med.nome,
                    totalDoses: med.total_doses,
                    dosesTomadas,
                    dosesRestantes,
                    progresso: Math.min(100, progresso)
                };
            });

            setMedicamentosSummary(sumario);
        } catch (error) {
            console.error("Erro ao carregar sumário de medicamentos:", error);
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

    const carregarHistorico = () => {
        try {
            // Usando a função centralizada no database.js
            const resultado = database.getHistoricoByUsuario(usuarioId);
            setHistorico(resultado);
            // Também atualizar o sumário quando o histórico é carregado
            carregarSumarioMedicamentos();
        } catch (error) {
            console.error("Erro ao carregar histórico:", error);
            Alert.alert("Erro", "Ocorreu um erro ao carregar o histórico de medicamentos.");
        }
    };

    const carregarMedicamentosAgendados = () => {
        try {
            // Usar o método centralizado para buscar medicamentos
            const todosOsMedicamentos = database.getMedicamentosByUsuario(usuarioId);

            // Filtrar apenas os que têm próxima dose definida
            const medicamentosComProximaDose = todosOsMedicamentos.filter(
                med => med.proxima_dose !== null && med.proxima_dose !== undefined
            );

            // Ordenar por data da próxima dose
            medicamentosComProximaDose.sort((a, b) => {
                return new Date(a.proxima_dose) - new Date(b.proxima_dose);
            });

            setMedicamentosAgendados(medicamentosComProximaDose);
        } catch (error) {
            console.error("Erro ao carregar medicamentos agendados:", error);
            Alert.alert("Erro", "Ocorreu um erro ao carregar os medicamentos agendados.");
        }
    };

    // Função para formatar valores que podem ser nulos
    const formatarValorOuPadrao = (valor, padrao = "Não especificado") => {
        return valor || padrao;
    };

    // Função para formatar intervalo
    const formatarIntervalo = (horas) => {
        if (!horas) return "Não especificado";
        return `${horas} em ${horas} horas`;
    };

    const renderItemHistorico = ({ item }) => (
        <View style={styles.item}>
            <View style={styles.itemHeader}>
                <View style={styles.medicationIconContainer}>
                    <Ionicons name="medical" size={22} color="#007bff" />
                </View>
                <Text style={styles.medicamentoNome}>{item.nome}</Text>
            </View>

            <View style={styles.itemBody}>
                <View style={styles.infoRow}>
                    <Ionicons name="calculator-outline" size={16} color="#7f8c8d" style={styles.infoIcon} />
                    <Text style={styles.infoText}>Quantidade: {formatarValorOuPadrao(item.quantidade)}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={16} color="#7f8c8d" style={styles.infoIcon} />
                    <Text style={styles.infoText}>Intervalo: {formatarIntervalo(item.intervalo_horas)}</Text>
                </View>

                <View style={styles.dateContainer}>
                    <Ionicons name="checkmark-circle" size={16} color="#28a745" style={styles.infoIcon} />
                    <Text style={styles.dataHora}>Tomado em: {new Date(item.tomado_em).toLocaleString('pt-BR')}</Text>
                </View>
            </View>
        </View>
    );

    const renderItemAgendado = ({ item }) => (
        <View style={styles.item}>
            <View style={styles.itemHeader}>
                <View style={[styles.medicationIconContainer, { backgroundColor: '#f0fff9' }]}>
                    <Ionicons name="alarm" size={22} color="#28a745" />
                </View>
                <Text style={styles.medicamentoNome}>{item.nome}</Text>
            </View>

            <View style={styles.itemBody}>
                <View style={styles.infoRow}>
                    <Ionicons name="calculator-outline" size={16} color="#7f8c8d" style={styles.infoIcon} />
                    <Text style={styles.infoText}>Quantidade: {formatarValorOuPadrao(item.quantidade)}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={16} color="#7f8c8d" style={styles.infoIcon} />
                    <Text style={styles.infoText}>Intervalo: {formatarIntervalo(item.intervalo_horas)}</Text>
                </View>

                <View style={[styles.dateContainer, { backgroundColor: '#f0fff9' }]}>
                    <Ionicons name="alarm" size={16} color="#28a745" style={styles.infoIcon} />
                    <Text style={[styles.dataHora, { color: '#28a745' }]}>
                        Próxima dose: {new Date(item.proxima_dose).toLocaleString('pt-BR')}
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name={visualizacao === 'historico' ? "time" : "calendar"} size={24} color="#007bff" />
                    <Text style={styles.headerTitle}>
                        {visualizacao === 'historico' ? 'Histórico de Medicamentos' : 'Medicamentos Agendados'}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <Ionicons name="person-circle" size={22} color="#007bff" />
                    <Text style={styles.headerUserName}>{nomeUsuario || 'Usuário'}</Text>
                </View>
            </View>

            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleButton, visualizacao === 'historico' ? styles.toggleActive : {}]}
                    onPress={() => setVisualizacao('historico')}
                >
                    <Ionicons name="time-outline" size={18} color={visualizacao === 'historico' ? "#fff" : "#007bff"} />
                    <Text style={[styles.toggleText, visualizacao === 'historico' ? styles.toggleTextActive : {}]}>Histórico</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, visualizacao === 'agendados' ? styles.toggleActive : {}]}
                    onPress={() => setVisualizacao('agendados')}
                >
                    <Ionicons name="calendar-outline" size={18} color={visualizacao === 'agendados' ? "#fff" : "#007bff"} />
                    <Text style={[styles.toggleText, visualizacao === 'agendados' ? styles.toggleTextActive : {}]}>Agendados</Text>
                </TouchableOpacity>
            </View>

            {/* Sumário de Medicamentos com Doses */}
            {medicamentosSummary.length > 0 && (
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryHeader}>
                        <Ionicons name="stats-chart" size={18} color="#007bff" />
                        <Text style={styles.summaryTitle}>Progresso dos Medicamentos</Text>
                    </View>

                    {medicamentosSummary.map(med => (
                        <View key={med.id} style={styles.summaryItem}>
                            <Text style={styles.summaryMedicamento}>{med.nome}</Text>
                            <View style={styles.progressContainer}>
                                <View style={[styles.progressBar, { width: `${med.progresso}%` }]} />
                            </View>
                            <Text style={styles.summaryText}>
                                {med.dosesTomadas}/{med.totalDoses} doses ({med.dosesRestantes} restantes)
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {visualizacao === 'historico' ? (
                historico.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={70} color="#ccc" />
                        <Text style={styles.emptyStateText}>Nenhum histórico encontrado</Text>
                        <Text style={styles.emptyStateSubtext}>Os medicamentos marcados como tomados aparecerão aqui</Text>
                    </View>
                ) : (
                    <FlatList
                        data={historico}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={renderItemHistorico}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={carregarDados}
                                colors={['#007bff']}
                            />
                        }
                    />)
            ) : (
                medicamentosAgendados.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="alarm-off" size={70} color="#ccc" />
                        <Text style={styles.emptyStateText}>Nenhum medicamento agendado</Text>
                        <Text style={styles.emptyStateSubtext}>Os medicamentos agendados aparecerão aqui</Text>
                    </View>
                ) : (
                    <FlatList
                        data={medicamentosAgendados}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={renderItemAgendado}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={carregarDados}
                                colors={['#007bff']}
                            />
                        }
                    />)
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        padding: 16
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0'
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f9ff',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 10
    },
    headerUserName: {
        fontSize: 16,
        color: '#007bff',
        fontWeight: '500',
        marginLeft: 6
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        padding: 5,
        backgroundColor: '#f5f5f5',
        borderRadius: 25
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 20,
        marginHorizontal: 4
    },
    toggleActive: {
        backgroundColor: '#007bff',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#007bff',
        marginLeft: 5
    },
    toggleTextActive: {
        color: 'white',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 50
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#555',
        marginTop: 20
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#888',
        marginTop: 8,
        textAlign: 'center'
    },
    summaryContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 8
    },
    summaryItem: {
        marginBottom: 12
    },
    summaryMedicamento: {
        fontSize: 14,
        fontWeight: '500',
        color: '#444',
        marginBottom: 4
    },
    progressContainer: {
        height: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
        marginBottom: 4
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#007bff',
        borderRadius: 5
    },
    summaryText: {
        fontSize: 12,
        color: '#666'
    },
    item: {
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 8
    },
    medicationIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f0f9ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10
    },
    medicamentoNome: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1
    },
    itemBody: {
        paddingLeft: 6
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    infoIcon: {
        marginRight: 8
    },
    infoText: {
        color: '#555',
        fontSize: 14
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 8,
        borderRadius: 6,
        marginTop: 5
    },
    dataHora: {
        color: '#666',
        fontStyle: 'italic',
        fontSize: 14
    }
});