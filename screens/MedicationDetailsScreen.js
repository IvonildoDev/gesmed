import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import database from '../src/database/database';

export default function MedicationDetailsScreen({ route, navigation }) {
    const { medicamentoId } = route.params;
    const [medicamento, setMedicamento] = useState(null);
    const [infoMedicamento, setInfoMedicamento] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erroApi, setErroApi] = useState(false);

    useEffect(() => {
        // Carregar informações do medicamento do banco de dados local
        carregarMedicamento();
    }, []);

    const carregarMedicamento = () => {
        try {
            const resultado = database.getMedicamentoById(medicamentoId);
            if (resultado) {
                setMedicamento(resultado);
                // Após carregar as informações locais, buscar informações online
                buscarInfoMedicamentoOnline(resultado.nome);
            } else {
                setCarregando(false);
                Alert.alert('Erro', 'Medicamento não encontrado');
            }
        } catch (error) {
            console.error("Erro ao carregar medicamento:", error);
            setCarregando(false);
            Alert.alert('Erro', 'Não foi possível carregar os detalhes do medicamento');
        }
    };

    const buscarInfoMedicamentoOnline = async (nomeMedicamento) => {
        setCarregando(true);
        setErroApi(false);

        try {
            // Removemos caracteres especiais e palavras como "comprimido", "mg", etc.
            const termoLimpo = nomeMedicamento
                .replace(/(comprimido|mg|ml|gotas|injetável|xarope|cápsula|dose)/gi, '')
                .trim();

            // Usamos a Wikipedia API para obter informações sobre o medicamento
            const url = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(termoLimpo)}`;

            const resposta = await fetch(url);
            const dados = await resposta.json();

            if (dados.type === 'disambiguation' || !dados.extract) {
                // Tentar com o termo mais específico - adicionar "medicamento" ao termo
                const urlMedicamento = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(termoLimpo + " medicamento")}`;
                const respostaMedicamento = await fetch(urlMedicamento);
                const dadosMedicamento = await respostaMedicamento.json();

                if (dadosMedicamento.extract) {
                    setInfoMedicamento({
                        descricao: dadosMedicamento.extract,
                        url: dadosMedicamento.content_urls?.desktop?.page || null,
                        fonte: 'Wikipedia'
                    });
                } else {
                    // Se ainda não encontrou, buscar como princípio ativo
                    const urlPrincipioAtivo = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(termoLimpo + " princípio ativo")}`;
                    const respostaPrincipioAtivo = await fetch(urlPrincipioAtivo);
                    const dadosPrincipioAtivo = await respostaPrincipioAtivo.json();

                    if (dadosPrincipioAtivo.extract) {
                        setInfoMedicamento({
                            descricao: dadosPrincipioAtivo.extract,
                            url: dadosPrincipioAtivo.content_urls?.desktop?.page || null,
                            fonte: 'Wikipedia'
                        });
                    } else {
                        setErroApi(true);
                    }
                }
            } else {
                setInfoMedicamento({
                    descricao: dados.extract,
                    url: dados.content_urls?.desktop?.page || null,
                    fonte: 'Wikipedia'
                });
            }
        } catch (error) {
            console.error("Erro ao buscar informações online:", error);
            setErroApi(true);
        } finally {
            setCarregando(false);
        }
    };

    const formatarData = (dataString) => {
        if (!dataString) return "Não definido";
        try {
            const data = new Date(dataString);
            return data.toLocaleDateString('pt-BR', {
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

    const formatarIntervalo = (horas) => {
        if (!horas) return "Não definido";
        return `${horas} em ${horas} horas`;
    };

    const abrirUrlCompleta = (url) => {
        if (url) {
            Linking.openURL(url)
                .catch(err => Alert.alert('Erro', 'Não foi possível abrir o link'));
        }
    };

    const buscarNovamente = () => {
        if (medicamento) {
            buscarInfoMedicamentoOnline(medicamento.nome);
        }
    };

    // Função para exibir usos comuns com base no nome do medicamento
    const renderUsosComuns = (nomeMedicamento) => {
        // Banco de dados simples de usos comuns para alguns medicamentos genéricos
        const usosComuns = {
            'dipirona': ['Dor', 'Febre', 'Dores de cabeça'],
            'paracetamol': ['Dor leve a moderada', 'Febre', 'Dores musculares'],
            'ibuprofeno': ['Dor', 'Inflamação', 'Febre', 'Artrite'],
            'amoxicilina': ['Infecções bacterianas', 'Pneumonia', 'Infecções de ouvido'],
            'omeprazol': ['Azia', 'Refluxo gastroesofágico', 'Úlceras'],
            'losartana': ['Hipertensão', 'Insuficiência cardíaca'],
            'atorvastatina': ['Colesterol alto', 'Prevenção de doenças cardíacas'],
            'metformina': ['Diabetes tipo 2', 'Resistência à insulina'],
            'fluoxetina': ['Depressão', 'Transtorno obsessivo-compulsivo', 'Ansiedade'],
            'levotiroxina': ['Hipotireoidismo', 'Tireoide hipoativa'],
        };

        // Procura por palavras-chave no nome do medicamento
        const nomeLowerCase = nomeMedicamento.toLowerCase();
        let usos = [];

        Object.keys(usosComuns).forEach(key => {
            if (nomeLowerCase.includes(key)) {
                usos = usosComuns[key];
            }
        });

        // Se não encontrou usos específicos, usar uma mensagem genérica
        if (usos.length === 0) {
            return (
                <Text style={styles.disclaimerTexto}>
                    As informações específicas sobre os usos de {nomeMedicamento} devem ser
                    consultadas na bula ou com seu médico.
                </Text>
            );
        }

        // Retornar a lista de usos comuns
        return (
            <>
                {usos.map((uso, index) => (
                    <View key={index} style={styles.usoItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                        <Text style={styles.usoTexto}>{uso}</Text>
                    </View>
                ))}
            </>
        );
    };

    if (!medicamento) {
        return (
            <View style={styles.telaCarregamento}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={styles.textoCarregamento}>Carregando detalhes...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.cartaoMedicamento}>
                <View style={styles.cabecalhoCartao}>
                    <View style={styles.iconeContainer}>
                        <Ionicons name="medical" size={30} color="#007bff" />
                    </View>
                    <Text style={styles.nomeMedicamento}>{medicamento.nome}</Text>
                </View>

                <View style={styles.divisor} />

                <View style={styles.infoContainer}>
                    <View style={styles.infoItem}>
                        <Ionicons name="calculator-outline" size={20} color="#666" />
                        <Text style={styles.infoLabel}>Dosagem:</Text>
                        <Text style={styles.infoValor}>{medicamento.quantidade || "1 comprimido"}</Text>
                    </View>

                    <View style={styles.infoItem}>
                        <Ionicons name="time-outline" size={20} color="#666" />
                        <Text style={styles.infoLabel}>Intervalo:</Text>
                        <Text style={styles.infoValor}>{formatarIntervalo(medicamento.intervalo_horas)}</Text>
                    </View>

                    <View style={styles.infoItem}>
                        <Ionicons name="calendar-outline" size={20} color="#666" />
                        <Text style={styles.infoLabel}>Próxima dose:</Text>
                        <Text style={styles.infoValor}>{formatarData(medicamento.proxima_dose)}</Text>
                    </View>

                    {medicamento.total_doses > 0 && (
                        <View style={styles.infoItem}>
                            <Ionicons name="list-outline" size={20} color="#666" />
                            <Text style={styles.infoLabel}>Doses totais:</Text>
                            <Text style={styles.infoValor}>{medicamento.total_doses}</Text>
                        </View>
                    )}

                    {medicamento.observacoes && (
                        <View style={styles.infoItem}>
                            <Ionicons name="document-text-outline" size={20} color="#666" />
                            <Text style={styles.infoLabel}>Observações:</Text>
                            <Text style={styles.infoValor}>{medicamento.observacoes}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Seção de dicas e orientações */}
            <View style={styles.cartaoOrientacoes}>
                <View style={styles.cabecalhoInformacoes}>
                    <Text style={styles.tituloInformacoes}>Orientações Gerais</Text>
                    <Ionicons name="information-circle" size={24} color="#28a745" />
                </View>

                <View style={styles.divisor} />

                <View style={styles.orientacoesContainer}>
                    <View style={styles.dicaItem}>
                        <Ionicons name="time" size={22} color="#28a745" />
                        <Text style={styles.dicaTexto}>
                            Tome o medicamento nos horários programados, mesmo que se sinta bem.
                        </Text>
                    </View>

                    <View style={styles.dicaItem}>
                        <Ionicons name="water" size={22} color="#28a745" />
                        <Text style={styles.dicaTexto}>
                            Tome com um copo cheio de água, salvo orientação contrária.
                        </Text>
                    </View>

                    <View style={styles.dicaItem}>
                        <Ionicons name="fast-food" size={22} color="#28a745" />
                        <Text style={styles.dicaTexto}>
                            Verifique se o medicamento deve ser tomado com ou sem alimentos.
                        </Text>
                    </View>

                    <View style={styles.dicaItem}>
                        <Ionicons name="alarm" size={22} color="#28a745" />
                        <Text style={styles.dicaTexto}>
                            Não se esqueça de tomar - configure lembretes no aplicativo!
                        </Text>
                    </View>

                    <View style={styles.dicaItem}>
                        <Ionicons name="warning" size={22} color="#28a745" />
                        <Text style={styles.dicaTexto}>
                            Nunca interrompa o tratamento sem consultar seu médico.
                        </Text>
                    </View>
                </View>
            </View>

            {/* Seção de informações online do medicamento */}
            <View style={styles.cartaoInformacoes}>
                <View style={styles.cabecalhoInformacoes}>
                    <Text style={styles.tituloInformacoes}>Informações do Medicamento</Text>
                    <TouchableOpacity
                        style={styles.botaoAtualizar}
                        onPress={buscarNovamente}
                    >
                        <Ionicons name="refresh" size={20} color="#007bff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.divisor} />

                {carregando ? (
                    <View style={styles.carregandoContainer}>
                        <ActivityIndicator size="large" color="#007bff" />
                        <Text style={styles.textoCarregando}>Buscando informações...</Text>
                    </View>
                ) : erroApi ? (
                    <View style={styles.erroContainer}>
                        <Ionicons name="alert-circle-outline" size={40} color="#dc3545" />
                        <Text style={styles.textoErro}>
                            Não foi possível encontrar informações sobre este medicamento.
                        </Text>
                        <Text style={styles.textoErroSugestao}>
                            Verifique a grafia do nome ou tente novamente mais tarde.
                        </Text>
                        <TouchableOpacity
                            style={styles.botaoTentarNovamente}
                            onPress={buscarNovamente}
                        >
                            <Text style={styles.textoBotaoTentarNovamente}>Tentar Novamente</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {infoMedicamento ? (
                            <View style={styles.infoOnlineContainer}>
                                <Text style={styles.descricaoSubtitulo}>Descrição:</Text>
                                <Text style={styles.descricaoMedicamento}>
                                    {infoMedicamento.descricao}
                                </Text>

                                <View style={styles.infoSeccaoContainer}>
                                    <Text style={styles.descricaoSubtitulo}>Usos Comuns:</Text>
                                    <View style={styles.usosContainer}>
                                        {renderUsosComuns(medicamento.nome)}
                                    </View>
                                </View>

                                <View style={styles.infoSeccaoContainer}>
                                    <Text style={styles.descricaoSubtitulo}>Possíveis Efeitos Colaterais:</Text>
                                    <View style={styles.efeitosContainer}>
                                        <Text style={styles.disclaimerTexto}>
                                            Os medicamentos podem causar efeitos colaterais. Consulte a bula
                                            ou o seu médico para informações específicas sobre {medicamento.nome}.
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.fonteContainer}>
                                    <Text style={styles.textoFonte}>Fonte: {infoMedicamento.fonte}</Text>
                                    {infoMedicamento.url && (
                                        <TouchableOpacity
                                            style={styles.botaoLerMais}
                                            onPress={() => abrirUrlCompleta(infoMedicamento.url)}
                                        >
                                            <Text style={styles.textoBotaoLerMais}>Ler mais</Text>
                                            <Ionicons name="open-outline" size={16} color="#007bff" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <View style={styles.alertaContainer}>
                                    <Ionicons name="alert-circle" size={20} color="#ff9800" />
                                    <Text style={styles.alertaTexto}>
                                        As informações aqui apresentadas são apenas para fins educacionais.
                                        Sempre consulte um profissional de saúde antes de tomar qualquer medicamento.
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.semInfoContainer}>
                                <Ionicons name="information-circle-outline" size={40} color="#6c757d" />
                                <Text style={styles.textoSemInfo}>
                                    Não há informações adicionais disponíveis para este medicamento.
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </View>

            <View style={styles.botoesContainer}>
                <TouchableOpacity
                    style={styles.botaoVoltar}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="information-circle" size={20} color="#fff" />
                    <Text style={styles.textoBotaoVoltar}>Informações do Medicamento</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.botaoBuscarManual}
                    onPress={() => Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(medicamento.nome + ' bula medicamento')}`)}
                >
                    <Ionicons name="search" size={20} color="#fff" />
                    <Text style={styles.textoBotaoBuscarManual}>Buscar Bula</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16
    },
    telaCarregamento: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5'
    },
    textoCarregamento: {
        marginTop: 10,
        fontSize: 16,
        color: '#666'
    },
    cartaoMedicamento: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    cabecalhoCartao: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16
    },
    iconeContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#e6f2ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    nomeMedicamento: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        flex: 1
    },
    divisor: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 12
    },
    infoContainer: {
        marginTop: 8
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    infoLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#555',
        marginLeft: 8,
        width: 100
    },
    infoValor: {
        fontSize: 16,
        color: '#333',
        flex: 1
    },
    cartaoInformacoes: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    cabecalhoInformacoes: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    tituloInformacoes: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333'
    },
    botaoAtualizar: {
        padding: 8
    },
    carregandoContainer: {
        padding: 20,
        alignItems: 'center'
    },
    textoCarregando: {
        marginTop: 10,
        fontSize: 16,
        color: '#666'
    },
    erroContainer: {
        padding: 20,
        alignItems: 'center'
    },
    textoErro: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '500',
        color: '#dc3545',
        textAlign: 'center'
    },
    textoErroSugestao: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
        textAlign: 'center'
    },
    botaoTentarNovamente: {
        marginTop: 16,
        backgroundColor: '#f8d7da',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20
    },
    textoBotaoTentarNovamente: {
        color: '#dc3545',
        fontWeight: '500'
    },
    infoOnlineContainer: {
        padding: 8
    },
    descricaoMedicamento: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24
    },
    fonteContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0'
    },
    textoFonte: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic'
    },
    botaoLerMais: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8
    },
    textoBotaoLerMais: {
        color: '#007bff',
        marginRight: 4,
        fontSize: 14,
        fontWeight: '500'
    },
    alertaContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff8e1',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
        alignItems: 'flex-start'
    },
    alertaTexto: {
        marginLeft: 8,
        flex: 1,
        color: '#ff8f00',
        fontSize: 14
    },
    semInfoContainer: {
        padding: 20,
        alignItems: 'center'
    },
    textoSemInfo: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
        textAlign: 'center'
    },
    botoesContainer: {
        flexDirection: 'column',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    botaoVoltar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#28a745',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginBottom: 12
    },
    textoBotaoVoltar: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8
    },
    botaoBuscarManual: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#007bff',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8
    },
    textoBotaoBuscarManual: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8
    },
    cartaoOrientacoes: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 16,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderLeftWidth: 4,
        borderLeftColor: '#28a745',
    },
    orientacoesContainer: {
        marginVertical: 10,
    },
    dicaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 5,
    },
    dicaTexto: {
        fontSize: 15,
        color: '#444',
        marginLeft: 12,
        flex: 1,
    },
    descricaoSubtitulo: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 6,
        marginTop: 10,
    },
    infoSeccaoContainer: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    usosContainer: {
        marginVertical: 8,
    },
    usoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    usoTexto: {
        fontSize: 15,
        color: '#444',
        marginLeft: 8,
    },
    efeitosContainer: {
        marginVertical: 8,
        backgroundColor: '#f8f9fa',
        padding: 10,
        borderRadius: 6,
    },
    disclaimerTexto: {
        fontSize: 15,
        color: '#555',
        lineHeight: 22,
    }
});
