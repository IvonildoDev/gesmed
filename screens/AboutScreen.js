import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AboutScreen({ navigation }) {
    const appVersion = "1.0.0";
    const anoAtual = new Date().getFullYear();

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="information-circle" size={28} color="#007bff" />
                <Text style={styles.headerTitle}>Sobre o GesMed</Text>
            </View>

            {/* Seção do aplicativo */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Aplicativo GesMed</Text>
                <Text style={styles.versionText}>Versão {appVersion}</Text>
                <Text style={styles.description}>
                    O GesMed é um aplicativo para controle e gerenciamento de medicamentos,
                    permitindo que você monitore seus horários de medicação e mantenha um
                    histórico organizado.
                </Text>
            </View>

            {/* Seção de como usar */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Como usar</Text>

                <View style={styles.instructionItem}>
                    <View style={styles.instructionNumber}>
                        <Text style={styles.instructionNumberText}>1</Text>
                    </View>
                    <View style={styles.instructionContent}>
                        <Text style={styles.instructionTitle}>Cadastro</Text>
                        <Text style={styles.instructionText}>
                            Ao abrir o aplicativo pela primeira vez, cadastre-se com seu nome de usuário
                            e senha para começar.
                        </Text>
                    </View>
                </View>

                <View style={styles.instructionItem}>
                    <View style={styles.instructionNumber}>
                        <Text style={styles.instructionNumberText}>2</Text>
                    </View>
                    <View style={styles.instructionContent}>
                        <Text style={styles.instructionTitle}>Adicionar Medicamento</Text>
                        <Text style={styles.instructionText}>
                            Na tela principal, preencha o nome do medicamento, quantidade e selecione
                            o intervalo (6/6, 8/8 ou 12/12 horas). Depois toque em "Adicionar Medicamento".
                        </Text>
                    </View>
                </View>

                <View style={styles.instructionItem}>
                    <View style={styles.instructionNumber}>
                        <Text style={styles.instructionNumberText}>3</Text>
                    </View>
                    <View style={styles.instructionContent}>
                        <Text style={styles.instructionTitle}>Marcar como Tomado</Text>
                        <Text style={styles.instructionText}>
                            Quando tomar um medicamento, toque no botão "Tomado" para registrar
                            e o app calculará automaticamente o horário da próxima dose.
                        </Text>
                    </View>
                </View>

                <View style={styles.instructionItem}>
                    <View style={styles.instructionNumber}>
                        <Text style={styles.instructionNumberText}>4</Text>
                    </View>
                    <View style={styles.instructionContent}>
                        <Text style={styles.instructionTitle}>Ver Histórico</Text>
                        <Text style={styles.instructionText}>
                            Na tela de Histórico, você pode consultar todas as medicações já tomadas
                            e as próximas doses agendadas.
                        </Text>
                    </View>
                </View>

                <View style={styles.instructionItem}>
                    <View style={styles.instructionNumber}>
                        <Text style={styles.instructionNumberText}>5</Text>
                    </View>
                    <View style={styles.instructionContent}>
                        <Text style={styles.instructionTitle}>Notificações</Text>
                        <Text style={styles.instructionText}>
                            O aplicativo enviará notificações para lembrá-lo quando for hora de tomar
                            seus medicamentos. Você pode ativar ou desativar esta função a qualquer momento.
                        </Text>
                    </View>
                </View>
            </View>

            {/* Seção do desenvolvedor */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Desenvolvido por</Text>
                <View style={styles.developerCard}>
                    <View style={styles.developerIconContainer}>
                        <Ionicons name="code-slash" size={36} color="#007bff" />
                    </View>
                    <View style={styles.developerInfo}>
                        <Text style={styles.developerName}>Ivonildo Lima</Text>
                        <Text style={styles.developerRole}>Desenvolvedor Mobile</Text>
                        <TouchableOpacity
                            style={styles.contactButton}
                            onPress={() => Linking.openURL('mailto:ivonildo.lima@example.com')}
                        >
                            <Ionicons name="mail-outline" size={16} color="#fff" />
                            <Text style={styles.contactButtonText}>Contato</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Copyright */}
            <View style={styles.footer}>
                <Text style={styles.copyright}>© {anoAtual} GesMed - Todos os direitos reservados</Text>
                <Text style={styles.disclaimer}>
                    Este aplicativo não substitui consultas médicas profissionais.
                    Sempre consulte seu médico antes de ajustar qualquer regime medicamentoso.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0'
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 10
    },
    section: {
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8
    },
    versionText: {
        fontSize: 14,
        color: '#888',
        marginBottom: 12
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
        color: '#555'
    },
    instructionItem: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-start'
    },
    instructionNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#007bff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2
    },
    instructionNumberText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14
    },
    instructionContent: {
        flex: 1
    },
    instructionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4
    },
    instructionText: {
        fontSize: 14,
        lineHeight: 20,
        color: '#555'
    },
    developerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10
    },
    developerIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#f0f9ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16
    },
    developerInfo: {
        flex: 1
    },
    developerName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4
    },
    developerRole: {
        fontSize: 14,
        color: '#555',
        marginBottom: 12
    },
    contactButton: {
        backgroundColor: '#007bff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignSelf: 'flex-start'
    },
    contactButtonText: {
        color: 'white',
        marginLeft: 6,
        fontWeight: '500'
    },
    footer: {
        marginTop: 10,
        marginBottom: 30,
        alignItems: 'center',
        padding: 10
    },
    copyright: {
        fontSize: 12,
        color: '#888',
        marginBottom: 8
    },
    disclaimer: {
        fontSize: 11,
        color: '#999',
        textAlign: 'center',
        lineHeight: 16,
        paddingHorizontal: 20
    }
});
