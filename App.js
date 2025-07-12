import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { requestNotificationsPermissions } from './services/NotificationService';
import database from './src/database/database';
import LoginScreen from './screens/LoginScreen';
import MedicationScreen from './screens/MedicationScreen';
import HistoryScreen from './screens/HistoryScreen';
import AboutScreen from './screens/AboutScreen';

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
          headerTitle: 'GesMed - Medicamentos',
          headerStyle: {
            backgroundColor: '#007bff',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Tab.Screen
        name="HistoricoTab"
        component={HistoryScreen}
        initialParams={{ usuarioId }}
        options={{
          title: 'Histórico',
          headerTitle: 'GesMed - Histórico',
          headerStyle: {
            backgroundColor: '#007bff',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Tab.Screen
        name="SobreTab"
        component={AboutScreen}
        initialParams={{ usuarioId }}
        options={{
          title: 'Sobre',
          headerTitle: 'GesMed - Sobre',
          headerStyle: {
            backgroundColor: '#007bff',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [notificationListener, setNotificationListener] = React.useState();
  const [responseListener, setResponseListener] = React.useState();

  // Configuração de notificações e inicialização do banco de dados
  React.useEffect(() => {
    // Solicitar permissões para notificações
    requestNotificationsPermissions();

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
  }, []);

  // Inicialização do banco de dados usando o módulo centralizado
  React.useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await database.initDatabase();

        console.log("Banco de dados inicializado com sucesso!");
      } catch (error) {
        console.error("Erro na inicialização do banco de dados:", error);
      }
    };

    initializeDatabase();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            title: 'GesMed - Login',
            headerStyle: {
              backgroundColor: '#007bff',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{
            headerShown: false
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}