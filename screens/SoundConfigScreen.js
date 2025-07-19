import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Switch,
    ScrollView,
    Slider
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSoundConfig, saveSoundConfig, muteSoundTemporarily, isSoundMuted } from '../services/SoundService';

export default function SoundConfigScreen({ navigation }) {
    const [config, setConfig] = useState({
        repetitions: 3,
        interval: 1500,
        advanceWarning: 30,
        isMuted: false
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const soundConfig = await getSoundConfig();
            const muted = await isSoundMuted();
            setConfig({
                ...soundConfig,
                isMuted: muted
            });
        } catch (error) {
            console.error("Erro ao carregar configurações de som:", error);
            Alert.alert("Erro", "Não foi possível carregar as configurações de som.");
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        try {
            await saveSoundConfig(config);

            if (config.isMuted) {
                // Silenciar por um longo período (1 semana)
                await muteSoundTemporarily(10080); // 60 min * 24 horas * 7 dias = 10080 minutos
            } else {
                // Remover silenciamento
                await muteSoundTemporarily(0);
            }

            Alert.alert("Configurações Salvas", "As configurações de som foram salvas com sucesso.");
        } catch (error) {
            console.error("Erro ao salvar configurações:", error);
            Alert.alert("Erro", "Não foi possível salvar as configurações.");
        }
    };

    // A função de teste de som foi removida

    const resetToDefaults = () => {
        Alert.alert(
            "Restaurar Padrões",
            "Tem certeza que deseja restaurar as configurações padrão?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Restaurar",
                    onPress: async () => {
                        const defaultConfig = {
                            repetitions: 3,
                            interval: 1500,
                            advanceWarning: 30,
                            isMuted: false
                        };
                        setConfig(defaultConfig);
                        await saveSoundConfig(defaultConfig);
                        await muteSoundTemporarily(0); // Remover silenciamento
                        Alert.alert("Configurações Restauradas", "As configurações de som foram restauradas para o padrão.");
                    }
                }
            ]
        );
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="settings" size={24} color="#007bff" />
                <Text style={styles.headerTitle}>Configurações de Som</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <Text>Carregando configurações...</Text>
                </View>
            ) : (
                <>
                    {/* Informações sobre o sistema de alertas */}
                    <View style={styles.infoContainer}>
                        <View style={styles.infoHeader}>
                            <Ionicons name="information-circle" size={22} color="#007bff" />
                            <Text style={styles.infoTitle}>Sobre os Alertas Sonoros</Text>
                        </View>
                        <Text style={styles.infoText}>
                            Os alertas ajudam você a lembrar dos horários de medicação.
                            Configure abaixo como deseja que os alertas funcionem.
                        </Text>
                    </View>

                    {/* Silenciamento */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Silenciamento</Text>
                        <View style={styles.optionContainer}>
                            <View style={styles.optionTextContainer}>
                                <Ionicons
                                    name={config.isMuted ? "volume-mute" : "volume-high"}
                                    size={22}
                                    color={config.isMuted ? "#999" : "#007bff"}
                                />
                                <Text style={styles.optionText}>
                                    {config.isMuted ? "Alertas silenciados" : "Alertas sonoros ativos"}
                                </Text>
                            </View>
                            <Switch
                                value={!config.isMuted}
                                onValueChange={(value) => setConfig({ ...config, isMuted: !value })}
                                trackColor={{ false: '#e0e0e0', true: '#cce5ff' }}
                                thumbColor={!config.isMuted ? "#007bff" : "#999"}
                            />
                        </View>
                        {config.isMuted && (
                            <Text style={styles.warningText}>
                                Atenção! Nenhum alerta sonoro será emitido enquanto estiver silenciado.
                            </Text>
                        )}
                    </View>

                    {/* Repetições */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Repetições do Som</Text>
                        <Text style={styles.sectionDescription}>
                            Define quantas vezes o som de alarme será repetido quando um medicamento estiver próximo do horário.
                        </Text>
                        <Text style={styles.valueText}>{config.repetitions} vezes</Text>
                        <Slider
                            style={styles.slider}
                            minimumValue={1}
                            maximumValue={10}
                            step={1}
                            value={config.repetitions}
                            onValueChange={(value) => setConfig({ ...config, repetitions: value })}
                            minimumTrackTintColor="#007bff"
                            maximumTrackTintColor="#d3d3d3"
                        />
                        <View style={styles.sliderLabels}>
                            <Text style={styles.sliderLabelText}>1</Text>
                            <Text style={styles.sliderLabelText}>5</Text>
                            <Text style={styles.sliderLabelText}>10</Text>
                        </View>
                    </View>

                    {/* Intervalo */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Intervalo Entre Sons</Text>
                        <Text style={styles.sectionDescription}>
                            Tempo de pausa entre cada repetição do som de alarme (em segundos).
                        </Text>
                        <Text style={styles.valueText}>{config.interval / 1000} segundos</Text>
                        <Slider
                            style={styles.slider}
                            minimumValue={500}
                            maximumValue={3000}
                            step={500}
                            value={config.interval}
                            onValueChange={(value) => setConfig({ ...config, interval: value })}
                            minimumTrackTintColor="#007bff"
                            maximumTrackTintColor="#d3d3d3"
                        />
                        <View style={styles.sliderLabels}>
                            <Text style={styles.sliderLabelText}>0.5s</Text>
                            <Text style={styles.sliderLabelText}>1.5s</Text>
                            <Text style={styles.sliderLabelText}>3s</Text>
                        </View>
                    </View>

                    {/* Aviso Antecipado */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Aviso Antecipado</Text>
                        <Text style={styles.sectionDescription}>
                            Define com quantos minutos de antecedência você deseja ser alertado sobre um medicamento a ser tomado.
                        </Text>
                        <Text style={styles.valueText}>{config.advanceWarning} minutos antes</Text>
                        <Slider
                            style={styles.slider}
                            minimumValue={5}
                            maximumValue={60}
                            step={5}
                            value={config.advanceWarning}
                            onValueChange={(value) => setConfig({ ...config, advanceWarning: value })}
                            minimumTrackTintColor="#007bff"
                            maximumTrackTintColor="#d3d3d3"
                        />
                        <View style={styles.sliderLabels}>
                            <Text style={styles.sliderLabelText}>5min</Text>
                            <Text style={styles.sliderLabelText}>30min</Text>
                            <Text style={styles.sliderLabelText}>60min</Text>
                        </View>
                    </View>

                    {/* Botões de Ação */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.saveButton]}
                            onPress={saveConfig}
                        >
                            <Ionicons name="save" size={20} color="#fff" />
                            <Text style={styles.buttonText}>Salvar Configurações</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.resetButton]}
                            onPress={resetToDefaults}
                        >
                            <Ionicons name="refresh" size={20} color="#fff" />
                            <Text style={styles.buttonText}>Restaurar Padrões</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        padding: 16,
    },
    infoContainer: {
        backgroundColor: '#e6f2ff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 16,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#007bff',
        marginLeft: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    warningText: {
        color: '#dc3545',
        fontSize: 14,
        fontStyle: 'italic',
        marginTop: 8,
    },
    sectionDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
        lineHeight: 18,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    sectionContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    optionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    optionTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionText: {
        fontSize: 14,
        color: '#555',
        marginLeft: 8,
    },
    valueText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#007bff',
        marginBottom: 8,
        textAlign: 'center',
    },
    slider: {
        width: '100%',
        height: 40,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        marginTop: -10,
    },
    sliderLabelText: {
        fontSize: 12,
        color: '#666',
    },
    buttonContainer: {
        marginTop: 20,
        marginBottom: 40,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 8,
        marginBottom: 12,
        elevation: 1,
    },
    // O estilo do botão de teste foi removido
    saveButton: {
        backgroundColor: '#007bff',
    },
    resetButton: {
        backgroundColor: '#6c757d',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 10,
    },
});
