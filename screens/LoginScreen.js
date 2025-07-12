import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import database from '../src/database/database';

export default function LoginScreen({ navigation }) {
    const [nomeUsuario, setNomeUsuario] = useState('');
    const [senha, setSenha] = useState('');

    const fazerLogin = () => {
        try {
            const resultado = database.loginUser(nomeUsuario, senha);
            if (resultado) {
                navigation.navigate('MainTabs', { usuarioId: resultado.id });
            } else {
                Alert.alert('Erro', 'Nome de usuário ou senha incorretos');
            }
        } catch (error) {
            console.error("Erro ao fazer login:", error);
            Alert.alert('Erro', 'Ocorreu um erro ao tentar fazer login');
        }
    };

    const registrarUsuario = () => {
        if (!nomeUsuario || !senha) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos');
            return;
        }

        try {
            const result = database.addUser(nomeUsuario, senha);

            Alert.alert(
                'Sucesso',
                'Usuário registrado com sucesso',
                [{
                    text: 'OK',
                    onPress: () => fazerLogin() // Fazer login automaticamente após registro
                }]
            );
        } catch (error) {
            console.error("Erro ao registrar:", error);
            Alert.alert('Erro', 'Nome de usuário já existe ou ocorreu um erro no registro');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.logoContainer}>
                <Ionicons name="medical" size={80} color="#007bff" />
                <Text style={styles.logoText}>GesMed</Text>
                <Text style={styles.tagline}>Gerenciador de Medicamentos</Text>
            </View>

            <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={24} color="#7f8c8d" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Nome de usuário"
                        value={nomeUsuario}
                        onChangeText={setNomeUsuario}
                        placeholderTextColor="#7f8c8d"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={24} color="#7f8c8d" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Senha"
                        value={senha}
                        onChangeText={setSenha}
                        secureTextEntry
                        placeholderTextColor="#7f8c8d"
                    />
                </View>

                <TouchableOpacity style={styles.loginButton} onPress={fazerLogin}>
                    <Text style={styles.loginButtonText}>Entrar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.registerButton} onPress={registrarUsuario}>
                    <Text style={styles.registerButtonText}>Registrar</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>GesMed © 2025</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9'
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 60,
        marginBottom: 40
    },
    logoText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#007bff',
        marginTop: 10
    },
    tagline: {
        color: '#7f8c8d',
        fontSize: 16,
        marginTop: 5
    },
    formContainer: {
        paddingHorizontal: 30
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 10,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    inputIcon: {
        marginRight: 10
    },
    input: {
        flex: 1,
        height: 50,
        color: '#2c3e50',
        fontSize: 16
    },
    loginButton: {
        backgroundColor: '#007bff',
        borderRadius: 10,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    },
    registerButton: {
        borderWidth: 1,
        borderColor: '#007bff',
        backgroundColor: 'transparent',
        borderRadius: 10,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 15
    },
    registerButtonText: {
        color: '#007bff',
        fontSize: 18
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center'
    },
    footerText: {
        color: '#7f8c8d',
        fontSize: 12
    }
});