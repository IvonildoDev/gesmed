import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ScrollView,
    RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import database from '../src/database/database';

export default function RegisteredMedicationsScreen({ route, navigation }) {
    const { usuarioId } = route.params;
    const [nomeUsuario, setNomeUsuario] = useState('');
    const [medicamentos, setMedicamentos] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [visualizacao, setVisualizacao] = useState('lista'); // 'lista' ou 'cartoes'
    const [filtro, setFiltro] = useState('todos'); // 'todos', 'proxima', 'hoje'

    useEffect(() => {
        carregarDados();

        // Adicionar listener para atualizar quando a tela receber foco
        const unsubscribe = navigation.addListener('focus', () => {
            carregarDados();
        });

        // Limpar o listener quando o componente for desmontado
        return unsubscribe;
    }, [navigation]);

    const carregarDados = async () => {
        setRefreshing(true);
        try {
            carregarDadosUsuario();
            carregarMedicamentos();
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

    const carregarMedicamentos = () => {
        try {
            const resultado = database.getMedicamentosByUsuario(usuarioId);
            setMedicamentos(resultado);
        } catch (error) {
            console.error("Erro ao carregar medicamentos:", error);
            Alert.alert("Erro", "Não foi possível carregar os medicamentos.");
        }
    };

    // Formatar horário para exibição
    const formatarHorario = (dataString) => {
        if (!dataString) return "Não definido";
        try {
            const data = new Date(dataString);
            return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
        } catch (error) {
            return dataString;
        }
    };

    // Formatar data para exibição
    const formatarData = (dataString) => {
        if (!dataString) return "Não definido";
        try {
            const data = new Date(dataString);
            return data.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return dataString;
        }
    };

    // Formatar data e hora para exibição
    const formatarDataHora = (dataString) => {
        if (!dataString) return "Não definido";
        try {
            const data = new Date(dataString);
            return data.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dataString;
        }
    };

    // Formatar intervalo para exibição
    const formatarIntervalo = (horas) => {
        if (!horas) return "Não definido";
        return `${horas} em ${horas} horas`;
    };

    // Verificar se está perto da próxima dose (dentro de 2 horas)
    const estaNaHora = (proximaDose) => {
        if (!proximaDose) return false;

        try {
            const agora = new Date();
            const horaMedicamento = new Date(proximaDose);
            const diferencaMinutos = (horaMedicamento - agora) / (1000 * 60);
            return diferencaMinutos <= 120 && diferencaMinutos >= -30;
        } catch (error) {
            return false;
        }
    };

    // Verificar se a próxima dose é hoje
    const ehHoje = (proximaDose) => {
        if (!proximaDose) return false;

        try {
            const agora = new Date();
            const horaMedicamento = new Date(proximaDose);
            return (
                agora.getDate() === horaMedicamento.getDate() &&
                agora.getMonth() === horaMedicamento.getMonth() &&
                agora.getFullYear() === horaMedicamento.getFullYear()
            );
        } catch (error) {
            return false;
        }
    };

    // Filtrar medicamentos de acordo com o filtro selecionado
    const medicamentosFiltrados = () => {
        const agora = new Date();

        switch (filtro) {
            case 'proxima':
                return medicamentos.filter(med => estaNaHora(med.proxima_dose));
            case 'hoje':
                return medicamentos.filter(med => ehHoje(med.proxima_dose));
            default:
                return medicamentos;
        }
    };

    // Função para excluir um medicamento
    const excluirMedicamento = (id) => {
        Alert.alert(
            "Confirmar exclusão",
            "Tem certeza que deseja excluir este medicamento?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Excluir",
                    onPress: () => {
                        try {
                            database.deleteMedicamento(id);
                            Alert.alert("Sucesso", "Medicamento excluído com sucesso");
                            carregarMedicamentos();
                        } catch (error) {
                            console.error("Erro ao excluir medicamento:", error);
                            Alert.alert("Erro", "Não foi possível excluir o medicamento");
                        }
                    },
                    style: "destructive"
                }
            ]
        );
    };

    // Renderizar medicamento no modo de lista
    const renderItemLista = ({ item }) => {
        const proximaEm = estaNaHora(item.proxima_dose) ? "AGORA!" : formatarDataHora(item.proxima_dose);
        const isNaHora = estaNaHora(item.proxima_dose);

        return (
            <TouchableOpacity
                style={[styles.itemLista, isNaHora && styles.itemNaHora]}
                onPress={() => navigation.navigate('MedicamentosTab', {
                    screen: 'DetalhesMedicamento',
                    params: { medicamentoId: item.id, usuarioId }
                })}
            >
                <View style={styles.itemHeader}>
                    <View style={[styles.iconContainer, isNaHora && styles.iconContainerAlerta]}>
                        <Ionicons
                            name={isNaHora ? "alarm" : "medical"}
                            size={22}
                            color={isNaHora ? "#ff9800" : "#007bff"}
                        />
                    </View>
                    <Text style={styles.nomeMedicamento}>{item.nome}</Text>
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('MedicationDetails', { medicamentoId: item.id })}
                            style={styles.infoButton}
                        >
                            <Ionicons name="search" size={20} color="#28a745" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => excluirMedicamento(item.id)}
                            style={styles.actionButton}
                        >
                            <Ionicons name="trash-outline" size={20} color="#dc3545" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.itemDetalhes}>
                    <View style={styles.detalheRow}>
                        <Ionicons name="calculator-outline" size={16} color="#666" />
                        <Text style={styles.detalheText}>Quantidade: {item.quantidade || "1 comprimido"}</Text>
                    </View>
                    <View style={styles.detalheRow}>
                        <Ionicons name="time-outline" size={16} color="#666" />
                        <Text style={styles.detalheText}>Intervalo: {formatarIntervalo(item.intervalo_horas)}</Text>
                    </View>
                    <View style={styles.detalheRow}>
                        <Ionicons name="calendar-outline" size={16} color="#666" />
                        <Text style={styles.detalheText}>Próx. dose: {proximaEm}</Text>
                    </View>
                </View>

                {isNaHora && (
                    <View style={styles.alertaContainer}>
                        <Ionicons name="alert-circle" size={18} color="#ff9800" />
                        <Text style={styles.alertaText}>Hora de tomar este medicamento!</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // Renderizar medicamento no modo de cartões
    const renderItemCartao = ({ item }) => {
        const proximaEm = estaNaHora(item.proxima_dose) ? "AGORA!" : formatarDataHora(item.proxima_dose);
        const isNaHora = estaNaHora(item.proxima_dose);

        return (
            <View style={[styles.cartao, isNaHora && styles.cartaoNaHora]}>
                <View style={styles.cartaoHeader}>
                    <View style={styles.cartaoHeaderLeft}>
                        <View style={[styles.cartaoIconContainer, isNaHora && styles.cartaoIconAlerta]}>
                            <Ionicons
                                name={isNaHora ? "alarm" : "medical"}
                                size={28}
                                color={isNaHora ? "#ff9800" : "#007bff"}
                            />
                        </View>
                        <View>
                            <Text style={styles.cartaoNome}>{item.nome}</Text>
                            <Text style={styles.cartaoQuantidade}>{item.quantidade || "1 comprimido"}</Text>
                        </View>
                    </View>
                    <View style={styles.cartaoAcoes}>
                        <TouchableOpacity
                            style={styles.cartaoBotao}
                            onPress={() => navigation.navigate('MedicationDetails', { medicamentoId: item.id })}
                        >
                            <Ionicons name="search" size={22} color="#28a745" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.cartaoBotao}
                            onPress={() => navigation.navigate('MedicamentosTab', { medicamentoId: item.id })}
                        >
                            <Ionicons name="create-outline" size={22} color="#007bff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.cartaoBotao}
                            onPress={() => excluirMedicamento(item.id)}
                        >
                            <Ionicons name="trash-outline" size={22} color="#dc3545" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.cartaoDivider} />

                <View style={styles.cartaoInfo}>
                    <View style={styles.cartaoInfoItem}>
                        <Ionicons name="time-outline" size={18} color="#666" />
                        <Text style={styles.cartaoInfoText}>
                            <Text style={styles.cartaoInfoLabel}>Intervalo: </Text>
                            {formatarIntervalo(item.intervalo_horas)}
                        </Text>
                    </View>

                    <View style={styles.cartaoInfoItem}>
                        <Ionicons name="calendar-outline" size={18} color="#666" />
                        <Text style={styles.cartaoInfoText}>
                            <Text style={styles.cartaoInfoLabel}>Próxima dose: </Text>
                            {proximaEm}
                        </Text>
                    </View>
                </View>

                {isNaHora && (
                    <View style={styles.cartaoAlerta}>
                        <Ionicons name="alert-circle" size={20} color="#fff" />
                        <Text style={styles.cartaoAlertaText}>HORA DE TOMAR!</Text>
                    </View>
                )}

                <View style={styles.cartaoBotoesContainer}>
                    <TouchableOpacity
                        style={styles.cartaoBotaoTomado}
                        onPress={() => navigation.navigate('MedicamentosTab', { medicamentoId: item.id, acao: 'tomar' })}
                    >
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <Text style={styles.cartaoBotaoTomadoText}>Marcar como Tomado</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name="list" size={24} color="#007bff" />
                    <Text style={styles.headerTitle}>Medicamentos Cadastrados</Text>
                </View>
                <View style={styles.headerRight}>
                    <Ionicons name="person-circle" size={22} color="#007bff" />
                    <Text style={styles.headerUserName}>{nomeUsuario || 'Usuário'}</Text>
                </View>
            </View>

            {/* Botão para ir para a tela de Próximas Doses */}
            <TouchableOpacity
                style={styles.proximasDosesButton}
                onPress={() => navigation.navigate('ProximasDosesTab')}
            >
                <Ionicons name="time-outline" size={18} color="#fff" />
                <Text style={styles.proximasDosesButtonText}>Ver Próximas Doses</Text>
            </TouchableOpacity>

            <View style={styles.filtrosContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosScroll}>
                    <TouchableOpacity
                        style={[styles.filtroBotao, filtro === 'todos' && styles.filtroBotaoAtivo]}
                        onPress={() => setFiltro('todos')}
                    >
                        <Ionicons
                            name="apps"
                            size={16}
                            color={filtro === 'todos' ? "#fff" : "#007bff"}
                        />
                        <Text style={[styles.filtroText, filtro === 'todos' && styles.filtroTextAtivo]}>
                            Todos
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filtroBotao, filtro === 'proxima' && styles.filtroBotaoAtivo]}
                        onPress={() => setFiltro('proxima')}
                    >
                        <Ionicons
                            name="alarm"
                            size={16}
                            color={filtro === 'proxima' ? "#fff" : "#ff9800"}
                        />
                        <Text style={[styles.filtroText, filtro === 'proxima' && styles.filtroTextAtivo]}>
                            Próximas doses
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filtroBotao, filtro === 'hoje' && styles.filtroBotaoAtivo]}
                        onPress={() => setFiltro('hoje')}
                    >
                        <Ionicons
                            name="today"
                            size={16}
                            color={filtro === 'hoje' ? "#fff" : "#28a745"}
                        />
                        <Text style={[styles.filtroText, filtro === 'hoje' && styles.filtroTextAtivo]}>
                            Hoje
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <View style={styles.visualizacaoToggle}>
                <TouchableOpacity
                    style={[styles.visualizacaoBotao, visualizacao === 'lista' && styles.visualizacaoBotaoAtivo]}
                    onPress={() => setVisualizacao('lista')}
                >
                    <Ionicons
                        name="list"
                        size={20}
                        color={visualizacao === 'lista' ? "#fff" : "#007bff"}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.visualizacaoBotao, visualizacao === 'cartoes' && styles.visualizacaoBotaoAtivo]}
                    onPress={() => setVisualizacao('cartoes')}
                >
                    <Ionicons
                        name="grid"
                        size={20}
                        color={visualizacao === 'cartoes' ? "#fff" : "#007bff"}
                    />
                </TouchableOpacity>
            </View>

            {medicamentosFiltrados().length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="medical" size={70} color="#ddd" />
                    <Text style={styles.emptyText}>
                        {filtro === 'todos'
                            ? 'Nenhum medicamento cadastrado'
                            : filtro === 'proxima'
                                ? 'Nenhuma dose para ser tomada agora'
                                : 'Nenhuma dose agendada para hoje'}
                    </Text>
                    {filtro === 'todos' && (
                        <TouchableOpacity
                            style={styles.emptyButton}
                            onPress={() => navigation.navigate('MedicamentosTab')}
                        >
                            <Ionicons name="add-circle" size={18} color="#fff" />
                            <Text style={styles.emptyButtonText}>Adicionar Medicamento</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <FlatList
                    data={medicamentosFiltrados()}
                    keyExtractor={item => item.id.toString()}
                    renderItem={visualizacao === 'lista' ? renderItemLista : renderItemCartao}
                    contentContainerStyle={styles.listaContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={carregarDados}
                            colors={["#007bff"]}
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    proximasDosesButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007bff',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 25,
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 5,
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    proximasDosesButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 10,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f9ff',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    headerUserName: {
        fontSize: 14,
        color: '#007bff',
        fontWeight: '500',
        marginLeft: 6,
    },
    filtrosContainer: {
        backgroundColor: '#fff',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    filtrosScroll: {
        paddingHorizontal: 16,
    },
    filtroBotao: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#fff',
    },
    filtroBotaoAtivo: {
        backgroundColor: '#007bff',
        borderColor: '#007bff',
    },
    filtroText: {
        fontSize: 14,
        color: '#333',
        marginLeft: 5,
    },
    filtroTextAtivo: {
        color: '#fff',
    },
    visualizacaoToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    visualizacaoBotao: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    visualizacaoBotaoAtivo: {
        backgroundColor: '#007bff',
        borderColor: '#007bff',
    },
    listaContainer: {
        padding: 16,
    },
    itemLista: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    itemNaHora: {
        borderLeftWidth: 4,
        borderLeftColor: '#ff9800',
        backgroundColor: '#fff8e1',
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
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
    iconContainerAlerta: {
        backgroundColor: '#fff3e0',
    },
    nomeMedicamento: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    actionButton: {
        padding: 5,
    },
    infoButton: {
        padding: 5,
        marginRight: 5,
    },
    itemDetalhes: {
        marginLeft: 5,
    },
    detalheRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    detalheText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
    },
    alertaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff3e0',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 4,
        marginTop: 5,
    },
    alertaText: {
        color: '#ff9800',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    cartao: {
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    cartaoNaHora: {
        borderLeftWidth: 4,
        borderLeftColor: '#ff9800',
    },
    cartaoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
    },
    cartaoHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cartaoIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f0f9ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    cartaoIconAlerta: {
        backgroundColor: '#fff3e0',
    },
    cartaoNome: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    cartaoQuantidade: {
        fontSize: 14,
        color: '#666',
    },
    cartaoAcoes: {
        flexDirection: 'row',
    },
    cartaoBotao: {
        padding: 8,
        marginLeft: 8,
    },
    cartaoDivider: {
        height: 1,
        backgroundColor: '#eee',
    },
    cartaoInfo: {
        padding: 14,
    },
    cartaoInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    cartaoInfoText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
    },
    cartaoInfoLabel: {
        fontWeight: '500',
    },
    cartaoAlerta: {
        backgroundColor: '#ff9800',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    cartaoAlertaText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 8,
    },
    cartaoBotoesContainer: {
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    cartaoBotaoTomado: {
        backgroundColor: '#28a745',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 4,
    },
    cartaoBotaoTomadoText: {
        color: '#fff',
        fontWeight: '500',
        marginLeft: 8,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007bff',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 4,
    },
    emptyButtonText: {
        color: '#fff',
        fontWeight: '500',
        marginLeft: 8,
    },
});
