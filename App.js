import * as React from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { requestNotificationsPermissions } from './services/NotificationService';
import { playBellSound } from './services/SoundService';
import database from './src/database/database';
import LoginScreen from './screens/LoginScreen';
import MedicationScreen from './screens/MedicationScreen';
import HistoryScreen from './screens/HistoryScreen';
import AboutScreen from './screens/AboutScreen';
import RegisteredMedicationsScreen from './screens/RegisteredMedicationsScreen';
import ProximasDosesScreen from './screens/ProximasDosesScreen';
import SoundConfigScreen from './screens/SoundConfigScreen';
import MedicationDetailsScreen from './screens/MedicationDetailsScreen';
import AppHeader from './src/components/header/AppHeader';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Componente de navegação por abas para quando o usuário estiver logado
function MainTabs({ route }) {
  const { usuarioId } = route.params;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'MedicamentosTab') {
            iconName = focused ? 'medical' : 'medical-outline';
          } else if (route.name === 'MedicamentosCadastradosTab') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'ProximasDosesTab') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'HistoricoTab') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'SobreTab') {
            iconName = focused ? 'information-circle' : 'information-circle-outline';
          }

          // Você pode retornar qualquer componente aqui!
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: 'gray',
        headerShown: true
      })}
    >
      <Tab.Screen
        name="MedicamentosTab"
        component={MedicationScreen}
        initialParams={{ usuarioId }}
        options={{
          title: 'Medicamentos',
          headerTitle: props => <AppHeader title="GesMed - Medicamentos" {...props} />,
          headerStyle: {
            backgroundColor: '#007bff',
          },
          headerTintColor: '#fff',
          headerLeft: () => null, // Remove back button
        }}
      />
      <Tab.Screen
        name="MedicamentosCadastradosTab"
        component={RegisteredMedicationsScreen}
        initialParams={{ usuarioId }}
        options={{
          title: 'Cadastrados',
          headerTitle: props => <AppHeader title="GesMed - Medicamentos Cadastrados" {...props} />,
          headerStyle: {
            backgroundColor: '#007bff',
          },
          headerTintColor: '#fff',
          headerLeft: () => null, // Remove back button
        }}
      />
      <Tab.Screen
        name="ProximasDosesTab"
        component={ProximasDosesScreen}
        initialParams={{ usuarioId }}
        options={{
          title: 'Próx. Doses',
          headerTitle: props => <AppHeader title="GesMed - Próximas Doses" {...props} />,
          headerStyle: {
            backgroundColor: '#007bff',
          },
          headerTintColor: '#fff',
          headerLeft: () => null, // Remove back button
        }}
      />
      <Tab.Screen
        name="HistoricoTab"
        component={HistoryScreen}
        initialParams={{ usuarioId }}
        options={{
          title: 'Histórico',
          headerTitle: props => <AppHeader title="GesMed - Histórico" {...props} />,
          headerStyle: {
            backgroundColor: '#007bff',
          },
          headerTintColor: '#fff',
          headerLeft: () => null, // Remove back button
        }}
      />
      <Tab.Screen
        name="SobreTab"
        component={AboutScreen}
        initialParams={{ usuarioId }}
        options={{
          title: 'Sobre',
          headerTitle: props => <AppHeader title="GesMed - Sobre" {...props} />,
          headerStyle: {
            backgroundColor: '#007bff',
          },
          headerTintColor: '#fff',
          headerLeft: () => null, // Remove back button
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [notificationListener, setNotificationListener] = React.useState();
  const [responseListener, setResponseListener] = React.useState();
  const [appIsReady, setAppIsReady] = React.useState(false);

  // Configuração da splash screen personalizada e inicialização do app
  React.useEffect(() => {
    async function prepare() {
      try {
        // Não usamos mais a splash screen nativa
        // await SplashScreen.preventAutoHideAsync();
      } catch (e) {
        console.warn("Erro ao prevenir o escondimento automático da splash screen:", e);
      }

      try {
        // Inicializar banco de dados
        await database.initDatabase();
        console.log("Banco de dados inicializado com sucesso!");

        // Configurar permissões de notificação
        await requestNotificationsPermissions();

        // Simular um tempo mínimo de exibição da splash screen personalizada (3 segundos)
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (e) {
        console.warn("Erro durante a inicialização:", e);
      } finally {
        // Informar que o aplicativo está pronto
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Não precisamos mais esconder a splash screen nativa
  // React.useEffect(() => {
  //   if (appIsReady) {
  //     SplashScreen.hideAsync().catch(e => console.warn("Erro ao esconder splash screen:", e));
  //   }
  // }, [appIsReady]);

  // Configuração de notificações e sistema de som
  React.useEffect(() => {
    if (!appIsReady) return;

    // Solicitar permissão para notificações (isso também habilita reprodução de som)
    requestNotificationsPermissions().then(permissionGranted => {
      if (permissionGranted) {
        console.log('Permissões de notificação concedidas');

        // Inicializar o sistema de som silenciosamente (sem reproduzir som)
        // Isso prepara o sistema para tocar sons posteriormente quando necessário
        setTimeout(() => {
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
            }),
          });
        }, 2000);
      } else {
        console.log('Permissões de notificação não concedidas');
      }
    });

    // Configurar listeners de notificação
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notificação recebida!', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notificação clicada!', response);
      // Aqui podemos navegar para uma tela específica quando o usuário clica na notificação
    });

    // Limpeza ao desmontar o componente
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [appIsReady]);

  // Renderizar a tela de splash personalizada enquanto o app está carregando
  if (!appIsReady) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashTitle}>GesMed</Text>
        <Text style={styles.splashSubtitle}>Gerenciador de medicamentos</Text>
        <View style={styles.pillIconContainer}>
          <Ionicons name="medkit" size={60} color="#fff" />
        </View>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            title: 'Login',
            headerTitle: props => <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>GesMed - Login</Text>,
            headerStyle: {
              backgroundColor: '#007bff',
            },
            headerTintColor: '#fff',
            headerTitleAlign: 'center',
          }}
        />
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{
            headerShown: false
          }}
        />
        <Stack.Screen
          name="SoundConfig"
          component={SoundConfigScreen}
          options={{
            title: 'Configurações de Som',
            headerTitle: props => <AppHeader title="GesMed - Configurações de Som" {...props} />,
            headerStyle: {
              backgroundColor: '#007bff',
            },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen
          name="MedicationDetails"
          component={MedicationDetailsScreen}
          options={{
            title: 'Detalhes do Medicamento',
            headerTitle: props => <AppHeader title="GesMed - Detalhes do Medicamento" {...props} />,
            headerStyle: {
              backgroundColor: '#007bff',
            },
            headerTintColor: '#fff',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080f25',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#001945', // Cor azul escura como na imagem
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  splashTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center'
  },
  splashSubtitle: {
    fontSize: 24,
    color: '#ffffff',
    marginBottom: 50,
    textAlign: 'center'
  },
  pillIconContainer: {
    marginTop: 80,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  }
});