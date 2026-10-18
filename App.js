import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  addDoc,
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCO9r_HjdXGbA8WeyJyd1G1gkxEVyrn09s',
  authDomain: 'chitchat-app-107ba.firebaseapp.com',
  projectId: 'chitchat-app-107ba',
  storageBucket: 'chitchat-app-107ba.firebasestorage.app',
  messagingSenderId: '637077629710',
  appId: '1:637077629710:web:ab1c525ae970701279055f',
  measurementId: 'G-BJQLGSW9D4',
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const COLORS = {
  primary: '#168A58',
  background: '#F1F8F4',
  card: '#FFFFFF',
  text: '#16352A',
  secondary: '#526B60',
  border: '#BED8C9',
  danger: '#B42318',
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function ContactsScreen({ navigation }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let active = true;

    async function loadContacts() {
      try {
        const permission = await Contacts.requestPermissionsAsync();
        if (permission.status !== 'granted') {
          if (active) {
            setPermissionDenied(true);
            setLoading(false);
          }
          return;
        }

        const result = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
          sort: Contacts.SortTypes.FirstName,
        });

        if (active) {
          const validContacts = (result.data || []).filter(
            (contact) => contact.name || contact.phoneNumbers?.length
          );
          setContacts(validContacts);
          setLoading(false);
        }
      } catch (error) {
        console.warn('Could not load contacts:', error);
        if (active) {
          setLoading(false);
          Alert.alert('Contacts unavailable', 'Your contacts could not be loaded. You can still use the app.');
        }
      }
    }

    loadContacts();
    return () => {
      active = false;
    };
  }, []);

  const renderContact = ({ item }) => (
    <TouchableOpacity
      accessibilityRole="button"
      style={styles.contactRow}
      onPress={() => navigation.navigate('Conversation', { title: item.name || 'Chat' })}
    >
      <View style={styles.avatar}>
        <Ionicons name="person" size={22} color={COLORS.primary} />
      </View>
      <View style={styles.contactDetails}>
        <Text style={styles.contactName}>{item.name || 'Unknown contact'}</Text>
        <Text style={styles.contactNumber}>
          {item.phoneNumbers?.[0]?.number || 'No phone number'}
        </Text>
      </View>
      <Ionicons name="chatbubble-ellipses-outline" size={21} color={COLORS.primary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 12) + 12 }]}>
      <Text style={styles.screenTitle}>Chit Chat</Text>
      <Text style={styles.screenSubtitle}>Your contacts</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.helperText}>Loading contacts…</Text>
        </View>
      ) : permissionDenied ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={44} color={COLORS.secondary} />
          <Text style={styles.emptyTitle}>Contacts permission is off</Text>
          <Text style={styles.helperText}>
            Allow contacts access in Android Settings to see your phone contacts.
          </Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={44} color={COLORS.secondary} />
          <Text style={styles.emptyTitle}>No contacts found</Text>
          <Text style={styles.helperText}>Contacts with names or phone numbers will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item, index) => String(item.id || item.lookupKey || index)}
          renderItem={renderContact}
          contentContainerStyle={styles.contactList}
        />
      )}
    </View>
  );
}

function ConversationScreen({ route, navigation }) {
  const title = route.params?.title || 'Chat';
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const messagesQuery = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore messages listener failed:', error);
        setLoading(false);
        Alert.alert(
          'Could not load messages',
          'Check your internet connection and your Firebase Firestore security rules.'
        );
      }
    );

    return unsubscribe;
  }, []);

  async function sendMessage() {
    const cleanText = messageText.trim();
    if (!cleanText || sending) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        text: cleanText,
        sender: 'Me',
        conversation: title,
        createdAt: serverTimestamp(),
      });
      setMessageText('');
    } catch (error) {
      console.warn('Sending message failed:', error);
      Alert.alert(
        'Message not sent',
        'Check your internet connection and make sure Firestore allows authenticated/authorized writes.'
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.chatHeader, { paddingTop: Math.max(insets.top, 8) + 8 }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.card} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.chatTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.chatSubtitle}>Chit Chat</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          style={styles.messageList}
          data={messages.filter((message) => !message.conversation || message.conversation === title)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={42} color={COLORS.secondary} />
              <Text style={styles.emptyTitle}>Start the conversation</Text>
              <Text style={styles.helperText}>Messages will appear here when sent.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.messageBubble, item.sender === 'Me' ? styles.myMessage : styles.theirMessage]}>
              <Text style={styles.messageSender}>{item.sender || 'User'}</Text>
              <Text style={styles.messageText}>{item.text || ''}</Text>
            </View>
          )}
        />
      )}

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message…"
          placeholderTextColor={COLORS.secondary}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={2000}
          returnKeyType="default"
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!messageText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={COLORS.card} />
          ) : (
            <Ionicons name="send" size={19} color={COLORS.card} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          height: 60,
          paddingTop: 6,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.secondary,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons
            name={focused ? 'people' : 'people-outline'}
            size={size || 22}
            color={color}
          />
        ),
        tabBarLabel: route.name,
      })}
    >
      <Tab.Screen name="Contacts" component={ContactsScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Conversation" component={ConversationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  screenTitle: { fontSize: 28, fontWeight: '800', color: COLORS.text, paddingHorizontal: 20 },
  screenSubtitle: { fontSize: 15, color: COLORS.secondary, paddingHorizontal: 20, marginTop: 4, marginBottom: 16 },
  contactList: { paddingHorizontal: 16, paddingBottom: 20 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DDF1E6', alignItems: 'center', justifyContent: 'center' },
  contactDetails: { flex: 1, marginLeft: 12 },
  contactName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  contactNumber: { fontSize: 13, color: COLORS.secondary, marginTop: 3 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginTop: 12 },
  helperText: { fontSize: 14, color: COLORS.secondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingBottom: 14 },
  backButton: { padding: 6 },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  chatTitle: { color: COLORS.card, fontSize: 18, fontWeight: '700' },
  chatSubtitle: { color: '#DDF1E6', fontSize: 12, marginTop: 2 },
  messageList: { flex: 1 },
  messageContent: { padding: 16, flexGrow: 1 },
  messageBubble: { maxWidth: '85%', borderRadius: 14, padding: 11, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#DDF1E6' },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: COLORS.card },
  messageSender: { fontSize: 11, color: COLORS.secondary, fontWeight: '700', marginBottom: 4 },
  messageText: { fontSize: 15, color: COLORS.text, lineHeight: 21 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 10, backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border },
  messageInput: { flex: 1, maxHeight: 110, minHeight: 42, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: COLORS.text, fontSize: 15 },
  sendButton: { width: 42, height: 42, borderRadius: 21, marginLeft: 8, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
});
