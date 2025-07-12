import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verificarEAgendarNotificacoes, agendarNotificacaoMedicamento, cancelarNotificacaoMedicamento } from '../services/NotificationService';
import database from '../src/database/database';

export default function MedicationScreen({ route, navigation }) {
    const { usuarioId } = route.params;
    const [nomeUsuario, setNomeUsuario] = useState('');
    const [nomeMedicamento, setNomeMedicamento] = useState('');
    const [quantidadeMedicamento, setQuantidadeMedicamento] = useState('');
    const [intervaloHoras, setIntervaloHoras] = useState(8); // Padrão: 8 em 8 horas
    const [medicamentos, setMedicamentos] = useState([]);
    const [notificacoesAtivas, setNotificacoesAtivas] = useState(true);

    useEffect(() => {
        carregarMedicamentos();
        carregarDadosUsuario();
    }, []);

    // Efeito para agendar notificações quando medicamentos mudam
    useEffect(() => {
        if (notificacoesAtivas && medicamentos.length > 0) {
            verificarEAgendarNotificacoes(medicamentos);
        }
    }, [medicamentos, notificacoesAtivas]);

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
            // Primeiro, carregar os dados sem modificar
            const resultado = database.getMedicamentosByUsuario(usuarioId);
            const agora = new Date();
            const medicamentosAtualizados = [...resultado];

            // Verificar medicamentos que precisam de atualização
            const atualizacoes = [];

            resultado.forEach(med => {
                let atualizado = false;
                const medicamentoAtualizado = { ...med };

                // Definir valores padrão para colunas que podem estar faltando
                if (!medicamentoAtualizado.quantidade) {
                    medicamentoAtualizado.quantidade = "1 comprimido";
                    atualizado = true;
                }

                if (!medicamentoAtualizado.intervalo_horas) {
                    medicamentoAtualizado.intervalo_horas = 8;
                    atualizado = true;
                }

                // Se não tiver próxima_dose, calcular a partir de horario_inicial ou horario
                if (!medicamentoAtualizado.proxima_dose) {
                    let dataDose;

                    if (medicamentoAtualizado.horario_inicial) {
                        dataDose = new Date(medicamentoAtualizado.horario_inicial);
                    } else if (medicamentoAtualizado.horario) {
                        // Converter horário formato HH:MM para timestamp
                        const [horas, minutos] = medicamentoAtualizado.horario.split(':').map(Number);
                        dataDose = new Date();
                        dataDose.setHours(horas || 8, minutos || 0, 0, 0);
                    } else {
                        dataDose = new Date();
                    }

                    // Calcular próxima dose
                    medicamentoAtualizado.proxima_dose = dataDose.toISOString();
                    atualizado = true;
                }

                // Verificar se a próxima dose já passou
                const proximaDose = new Date(medicamentoAtualizado.proxima_dose);
                if (proximaDose < agora) {
                    // Encontrar a próxima dose baseada no intervalo
                    let novaDose = new Date(proximaDose);
                    while (novaDose < agora) {
                        novaDose.setHours(novaDose.getHours() + medicamentoAtualizado.intervalo_horas);
                    }

                    medicamentoAtualizado.proxima_dose = novaDose.toISOString();
                    atualizado = true;
                }

                // Se houve alguma mudança, adicionar à lista de atualizações
                if (atualizado) {
                    atualizacoes.push({
                        id: medicamentoAtualizado.id,
                        quantidade: medicamentoAtualizado.quantidade,
                        intervalo_horas: medicamentoAtualizado.intervalo_horas,
                        proxima_dose: medicamentoAtualizado.proxima_dose
                    });

                    // Atualizar na lista local também
                    const index = medicamentosAtualizados.findIndex(m => m.id === med.id);
                    if (index !== -1) {
                        medicamentosAtualizados[index] = medicamentoAtualizado;
                    }
                }
            });

            // Se houver atualizações, atualizar cada medicamento
            if (atualizacoes.length > 0) {
                try {
                    atualizacoes.forEach(atualizacao => {
                        // Obter medicamento completo
                        const medicamento = database.getMedicamentoById(atualizacao.id);
                        if (medicamento) {
                            // Atualizar com os novos valores
                            const medicamentoAtualizado = {
                                ...medicamento,
                                quantidade: atualizacao.quantidade,
                                intervalo_horas: atualizacao.intervalo_horas,
                                proxima_dose: atualizacao.proxima_dose
                            };
                            // Salvar no banco
                            database.updateMedicamento(medicamentoAtualizado);
                        }
                    });
                } catch (error) {
                    console.error("Erro ao atualizar medicamentos:", error);
                    Alert.alert("Erro", "Ocorreu um erro ao atualizar os medicamentos.");
                }
            }

            // Atualizar o estado com os medicamentos (atualizados ou não)
            setMedicamentos(medicamentosAtualizados);
        } catch (error) {
            console.error("Erro ao carregar medicamentos:", error);
            Alert.alert("Erro", "Ocorreu um erro ao carregar os medicamentos.");
        }
    };

    const adicionarMedicamento = () => {
        if (nomeMedicamento && quantidadeMedicamento) {
            // Usar o horário atual como horário inicial
            const agora = new Date();
            const horarioInicial = agora.toISOString();

            // Calcular a próxima dose baseada no intervalo escolhido
            const proximaDose = new Date(agora);
            proximaDose.setHours(agora.getHours() + intervaloHoras);

            try {
                const novoMedicamento = {
                    usuario_id: usuarioId,
                    nome: nomeMedicamento,
                    quantidade: quantidadeMedicamento,
                    intervalo_horas: intervaloHoras,
                    horario_inicial: horarioInicial,
                    horario: agora.getHours() + ':' + agora.getMinutes(), // Para compatibilidade
                    proxima_dose: proximaDose.toISOString()
                };

                // Adicionar o medicamento usando o módulo centralizado
                const result = database.addMedicamento(novoMedicamento);

                // Após adicionar com sucesso, limpar os campos e recarregar
                setNomeMedicamento('');
                setQuantidadeMedicamento('');
                Alert.alert('Sucesso', 'Medicamento adicionado com sucesso');

                // Recarregar a lista após adicionar
                setTimeout(() => {
                    carregarMedicamentos();

                    // Agendar notificação para o medicamento adicionado
                    if (notificacoesAtivas) {
                        const medicamentosAtualizados = database.getMedicamentosByUsuario(usuarioId);
                        if (medicamentosAtualizados.length > 0) {
                            // Pegar o medicamento mais recente
                            const medicamentoMaisRecente = medicamentosAtualizados[0];
                            agendarNotificacaoMedicamento(medicamentoMaisRecente);
                        }
                    }
                }, 300);
            } catch (error) {
                console.error("Erro ao adicionar medicamento:", error);
                Alert.alert('Erro', 'Ocorreu um erro ao adicionar o medicamento');
            }
        } else {
            Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
        }
    };

    const marcarComoTomado = (medicamentoId) => {
        const agora = new Date().toISOString();

        try {
            // Primeiro obter informações do medicamento
            const medicamento = database.getMedicamentoById(medicamentoId);

            if (!medicamento) {
                Alert.alert('Erro', 'Medicamento não encontrado');
                return;
            }

            // Definir intervalo padrão se não estiver especificado
            const intervaloHoras = medicamento.intervalo_horas || 8;

            // Calcular a próxima dose
            const proximaDose = new Date();
            proximaDose.setHours(proximaDose.getHours() + intervaloHoras);

            // Registrar que o medicamento foi tomado
            database.addHistorico(medicamentoId, agora);

            // Atualizar o medicamento com a próxima dose
            const medicamentoAtualizado = {
                ...medicamento,
                proxima_dose: proximaDose.toISOString(),
                intervalo_horas: intervaloHoras
            };
            database.updateMedicamento(medicamentoAtualizado);

            Alert.alert('Sucesso', 'Medicamento marcado como tomado');

            // Recarregar após o sucesso com um pequeno atraso para garantir que a transação terminou
            setTimeout(() => {
                carregarMedicamentos();

                // Reagendar notificação para a próxima dose
                if (notificacoesAtivas) {
                    const medicamentoAtualizado = {
                        ...medicamento,
                        proxima_dose: proximaDose.toISOString(),
                        intervalo_horas: intervaloHoras
                    };
                    agendarNotificacaoMedicamento(medicamentoAtualizado);
                }
            }, 300);
        } catch (error) {
            console.error("Erro ao marcar medicamento como tomado:", error);
            Alert.alert('Erro', 'Ocorreu um erro ao marcar o medicamento como tomado');
        }
    };

    const excluirMedicamento = (medicamentoId) => {
        Alert.alert(
            'Confirmar exclusão',
            'Tem certeza que deseja excluir este medicamento?',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Excluir',
                    onPress: () => {
                        try {
                            // Cancelar notificação antes de excluir
                            if (notificacoesAtivas) {
                                cancelarNotificacaoMedicamento(medicamentoId);
                            }

                            // Usar o módulo centralizado para excluir o medicamento
                            // Isso também excluirá automaticamente registros no histórico
                            database.deleteMedicamento(medicamentoId);

                            Alert.alert('Sucesso', 'Medicamento excluído com sucesso');

                            // Atualizar a lista de medicamentos
                            setTimeout(() => {
                                carregarMedicamentos();
                            }, 300);
                        } catch (error) {
                            console.error("Erro ao excluir medicamento:", error);
                            Alert.alert('Erro', 'Ocorreu um erro ao excluir o medicamento');
                        }
                    },
                    style: 'destructive',
                },
            ]
        );
    };

    // Formatar horário para exibição
    const formatarHorario = (dataString) => {
        if (!dataString) return "Não definido";
        try {
            const data = new Date(dataString);
            return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
        } catch (error) {
            return dataString; // Se não for possível converter, retornar o valor original
        }
    };

    // Formatar intervalo para exibição
    const formatarIntervalo = (horas) => {
        if (!horas) return "Não definido";
        return `${horas} em ${horas} horas`;
    };

    // Verificar se um medicamento está na hora de ser tomado (30 minutos de tolerância)
    const estaNaHora = (proximaDose) => {
        if (!proximaDose) return false;

        try {
            const agora = new Date();
            const horaMedicamento = new Date(proximaDose);

            // Calcula a diferença em minutos
            const diferencaMinutos = (horaMedicamento - agora) / (1000 * 60);

            // Está na hora se a próxima dose já passou ou está dentro dos próximos 30 minutos
            return diferencaMinutos <= 30 && diferencaMinutos >= -30;
        } catch (error) {
            return false; // Em caso de erro, não alertar
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name="medkit" size={24} color="#007bff" />
                    <Text style={styles.headerTitle}>Meus Medicamentos</Text>
                </View>
                <View style={styles.headerRight}>
                    <Ionicons name="person-circle" size={22} color="#007bff" />
                    <Text style={styles.headerUserName}>{nomeUsuario || 'Usuário'}</Text>
                </View>
            </View>

            <View style={styles.notificationToggleContainer}>
                <View style={styles.notificationToggleLeft}>
                    <Ionicons name={notificacoesAtivas ? "notifications" : "notifications-off"} size={22} color={notificacoesAtivas ? "#007bff" : "#999"} />
                    <Text style={styles.notificationText}>Lembretes de medicamentos</Text>
                </View>
                <Switch
                    value={notificacoesAtivas}
                    onValueChange={(value) => {
                        setNotificacoesAtivas(value);
                        if (value) {
                            verificarEAgendarNotificacoes(medicamentos);
                            Alert.alert('Lembretes ativados', 'Você receberá notificações quando for hora de tomar seus medicamentos.');
                        } else {
                            // Cancelar todas as notificações
                            medicamentos.forEach(med => cancelarNotificacaoMedicamento(med.id));
                            Alert.alert('Lembretes desativados', 'Você não receberá mais notificações sobre seus medicamentos.');
                        }
                    }}
                    trackColor={{ false: '#e0e0e0', true: '#cce5ff' }}
                    thumbColor={notificacoesAtivas ? '#007bff' : '#999'}
                />
            </View>

            <View style={styles.formContainer}>
                <Text style={styles.titulo}>Adicionar Novo Medicamento</Text>

                <View style={styles.inputContainer}>
                    <Ionicons name="medical" size={22} color="#7f8c8d" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Nome do Medicamento"
                        value={nomeMedicamento}
                        onChangeText={setNomeMedicamento}
                        placeholderTextColor="#7f8c8d"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Ionicons name="calculator-outline" size={22} color="#7f8c8d" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Quantidade (ex: 1 comprimido, 10ml)"
                        value={quantidadeMedicamento}
                        onChangeText={setQuantidadeMedicamento}
                        placeholderTextColor="#7f8c8d"
                    />
                </View>

                <Text style={styles.label}>Intervalo de Horas:</Text>
                <View style={styles.intervaloContainer}>
                    <TouchableOpacity
                        style={[styles.intervaloButton, intervaloHoras === 6 && styles.intervaloButtonSelected]}
                        onPress={() => setIntervaloHoras(6)}>
                        <Ionicons
                            name="time-outline"
                            size={16}
                            color={intervaloHoras === 6 ? "#fff" : "#7f8c8d"}
                        />
                        <Text style={intervaloHoras === 6 ? styles.textoSelecionado : styles.textoIntervalo}>6/6h</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.intervaloButton, intervaloHoras === 8 && styles.intervaloButtonSelected]}
                        onPress={() => setIntervaloHoras(8)}>
                        <Ionicons
                            name="time-outline"
                            size={16}
                            color={intervaloHoras === 8 ? "#fff" : "#7f8c8d"}
                        />
                        <Text style={intervaloHoras === 8 ? styles.textoSelecionado : styles.textoIntervalo}>8/8h</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.intervaloButton, intervaloHoras === 12 && styles.intervaloButtonSelected]}
                        onPress={() => setIntervaloHoras(12)}>
                        <Ionicons
                            name="time-outline"
                            size={16}
                            color={intervaloHoras === 12 ? "#fff" : "#7f8c8d"}
                        />
                        <Text style={intervaloHoras === 12 ? styles.textoSelecionado : styles.textoIntervalo}>12/12h</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.addButton} onPress={adicionarMedicamento}>
                        <Ionicons name="add-circle-outline" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Adicionar Medicamento</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.listContainer}>
                <View style={styles.listHeader}>
                    <Ionicons name="list" size={20} color="#007bff" />
                    <Text style={styles.listHeaderTitle}>Medicamentos Cadastrados</Text>
                </View>

                {medicamentos.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="medical-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyStateText}>Nenhum medicamento cadastrado</Text>
                    </View>
                ) : (
                    <FlatList
                        data={medicamentos}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <View style={[styles.item, estaNaHora(item.proxima_dose) && styles.itemNaHora]}>
                                <View style={styles.itemContent}>
                                    <View style={styles.medicationIconContainer}>
                                        <Ionicons name={estaNaHora(item.proxima_dose) ? "alarm" : "medical"} size={28} color={estaNaHora(item.proxima_dose) ? "#ff9800" : "#007bff"} />
                                    </View>
                                    <View style={styles.medicationInfo}>
                                        <Text style={styles.nomeMedicamento}>{item.nome}</Text>
                                        <View style={styles.infoRow}>
                                            <Ionicons name="calculator-outline" size={14} color="#7f8c8d" />
                                            <Text style={styles.infoText}>Quantidade: {item.quantidade}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Ionicons name="time-outline" size={14} color="#7f8c8d" />
                                            <Text style={styles.infoText}>Intervalo: {formatarIntervalo(item.intervalo_horas)}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Ionicons name="calendar-outline" size={14} color="#7f8c8d" />
                                            <Text style={styles.infoText}>Próxima dose: {formatarHorario(item.proxima_dose)}</Text>
                                        </View>

                                        {estaNaHora(item.proxima_dose) && (
                                            <View style={styles.alertRow}>
                                                <Ionicons name="alert-circle" size={16} color="#ff9800" />
                                                <Text style={styles.alertaHorario}>HORA DE TOMAR!</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.buttonRow}>
                                    <TouchableOpacity
                                        style={styles.takenButton}
                                        onPress={() => marcarComoTomado(item.id)}
                                    >
                                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                                        <Text style={styles.takenButtonText}>Tomado</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => excluirMedicamento(item.id)}
                                    >
                                        <Ionicons name="trash-outline" size={18} color="#fff" />
                                        <Text style={styles.deleteButtonText}>Excluir</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />
                )}
            </View>
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
    notificationToggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        padding: 12,
        marginBottom: 15
    },
    notificationToggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    notificationText: {
        fontSize: 16,
        color: '#444',
        marginLeft: 8
    },
    formContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 12
    },
    inputIcon: {
        marginRight: 10
    },
    input: {
        flex: 1,
        height: 48,
        color: '#2c3e50',
        fontSize: 16
    },
    listContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3
    },
    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    listHeaderTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginLeft: 8
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40
    },
    emptyStateText: {
        marginTop: 10,
        fontSize: 16,
        color: '#999'
    },
    titulo: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333'
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        color: '#555',
        fontWeight: '500'
    },
    item: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 10,
        backgroundColor: 'white',
        marginBottom: 10,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1
    },
    itemContent: {
        flexDirection: 'row',
        marginBottom: 10
    },
    medicationIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#f0f9ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    medicationInfo: {
        flex: 1
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    infoText: {
        color: '#555',
        marginLeft: 6,
        fontSize: 14
    },
    alertRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5
    },
    itemNaHora: {
        backgroundColor: '#fff8e1',
        borderColor: '#ffa000',
        borderLeftWidth: 4,
    },
    nomeMedicamento: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 6
    },
    intervaloContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    intervaloButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 5,
        backgroundColor: '#f9f9f9'
    },
    textoIntervalo: {
        marginLeft: 5,
        fontSize: 14,
        color: '#555'
    },
    intervaloButtonSelected: {
        backgroundColor: '#007bff',
        borderColor: '#0062cc'
    },
    textoSelecionado: {
        color: 'white',
        fontWeight: '600',
        marginLeft: 5
    },
    buttonContainer: {
        marginVertical: 15
    },
    addButton: {
        backgroundColor: '#28a745',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8
    },
    takenButton: {
        backgroundColor: '#007bff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 8,
        flex: 1,
        marginRight: 8
    },
    takenButtonText: {
        color: 'white',
        marginLeft: 6,
        fontWeight: '500'
    },
    deleteButton: {
        backgroundColor: '#dc3545',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 8,
        width: 90
    },
    deleteButtonText: {
        color: 'white',
        marginLeft: 6,
        fontWeight: '500'
    },
    deleteButton: {
        backgroundColor: '#dc3545',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 8,
        marginLeft: 10
    },
    deleteButtonText: {
        color: 'white',
        marginLeft: 6,
        fontWeight: '500'
    },
    historyButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#6c757d',
        borderRadius: 30,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4
    },
    historyButtonText: {
        color: 'white',
        marginLeft: 8,
        fontWeight: 'bold'
    },
    alertaHorario: {
        color: '#ff9800',
        fontWeight: 'bold',
        marginLeft: 6
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
});