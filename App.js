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
  createUserWithEmailAndPassword, getAuth, GoogleAuthProvider, onAuthStateChanged,
  signInWithCredential, signInWithEmailAndPassword, signOut, updateProfile,
} from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
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
const auth = getAuth(firebaseApp);
WebBrowser.maybeCompleteAuthSession();

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
      <View style={styles.contactsTitleRow}>
        <View style={{ flex: 1 }}><Text style={styles.screenSubtitle}>Your contacts</Text></View>
        <TouchableOpacity onPress={() => signOut(auth).catch((error) => Alert.alert('Could not log out', authErrorMessage(error)))} style={styles.logoutButton} accessibilityRole="button" accessibilityLabel="Log out">
          <Ionicons name="log-out-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

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


function authErrorMessage(error) {
  const messages = {
    'auth/email-already-in-use': 'An account already exists for this email. Try logging in.',
    'auth/invalid-email': 'That email address is not valid.',
    'auth/weak-password': 'Choose a password with at least 6 characters.',
    'auth/user-not-found': 'No account found for this email. Create an account first.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/network-request-failed': 'Network error. Check your internet connection.',
    'auth/operation-not-allowed': 'Enable this sign-in method in Firebase Console → Authentication.',
  };
  return messages[error?.code] || error?.message || 'Something went wrong. Please try again.';
}

function AuthScreen() {
  const [mode, setMode] = useState('welcome');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
    androidClientId: 'YOUR_GOOGLE_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: 'YOUR_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params?.id_token;
    if (!idToken) {
      Alert.alert('Google sign-in', 'No ID token was returned. Check your Google OAuth setup.');
      return;
    }
    setBusy(true);
    signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
      .catch((error) => Alert.alert('Google sign-in failed', authErrorMessage(error)))
      .finally(() => setBusy(false));
  }, [response]);

  async function submitEmailAuth() {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert('Check your email', 'Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      Alert.alert('Name required', 'Enter your name to create an account.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'register') {
        const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await updateProfile(result.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
    } catch (error) {
      Alert.alert(mode === 'register' ? 'Registration failed' : 'Login failed', authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'welcome') return (
    <View style={styles.authScreen}>
      <View style={styles.heroCircle}><Ionicons name="chatbubbles" size={62} color="#FFFFFF" /></View>
      <Text style={styles.brandTitle}>Chit Chat</Text>
      <Text style={styles.authSubtitle}>Good conversations start here.</Text>
      <View style={styles.featureLine}><Ionicons name="people" size={20} color={COLORS.primary}/><Text style={styles.featureText}>Connect with people in your contacts</Text></View>
      <View style={styles.featureLine}><Ionicons name="chatbubble-ellipses" size={20} color={COLORS.primary}/><Text style={styles.featureText}>Keep your conversations in one place</Text></View>
      <TouchableOpacity style={styles.primaryAuthButton} onPress={() => setMode('login')} accessibilityRole="button"><Text style={styles.primaryAuthText}>Log in</Text></TouchableOpacity>
      <TouchableOpacity style={styles.secondaryAuthButton} onPress={() => setMode('register')} accessibilityRole="button"><Text style={styles.secondaryAuthText}>Create an account</Text></TouchableOpacity>
      <Text style={styles.authFootnote}>Simple messaging, made personal.</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.authScreen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={styles.authBack} onPress={() => setMode('welcome')} accessibilityRole="button"><Ionicons name="arrow-back" size={24} color={COLORS.text}/></TouchableOpacity>
      <View style={styles.authLogoSmall}><Ionicons name="chatbubbles" size={34} color="#FFFFFF"/></View>
      <Text style={styles.authHeading}>{mode === 'register' ? 'Create your account' : 'Welcome back'}</Text>
      <Text style={[styles.authSubtitle, {textAlign:'left'}]}>{mode === 'register' ? 'Join Chit Chat and stay connected.' : 'Log in to continue chatting.'}</Text>
      {mode === 'register' && <TextInput style={styles.authInput} placeholder="Your name" placeholderTextColor={COLORS.secondary} value={name} onChangeText={setName} autoCapitalize="words" returnKeyType="next" />}
      <TextInput style={styles.authInput} placeholder="Email address" placeholderTextColor={COLORS.secondary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" returnKeyType="next" />
      <TextInput style={styles.authInput} placeholder="Password (6+ characters)" placeholderTextColor={COLORS.secondary} value={password} onChangeText={setPassword} secureTextEntry textContentType={mode === 'register' ? 'newPassword' : 'password'} onSubmitEditing={submitEmailAuth} />
      <TouchableOpacity style={[styles.primaryAuthButton, busy && styles.authDisabled]} onPress={submitEmailAuth} disabled={busy} accessibilityRole="button">{busy ? <ActivityIndicator color="#FFFFFF"/> : <Text style={styles.primaryAuthText}>{mode === 'register' ? 'Create account' : 'Log in'}</Text>}</TouchableOpacity>
      <View style={styles.orRow}><View style={styles.orLine}/><Text style={styles.orText}>OR</Text><View style={styles.orLine}/></View>
      <TouchableOpacity style={[styles.googleButton, (!request || busy) && styles.authDisabled]} onPress={() => {
        if (!request || busy) return;
        const configured = ![
          'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
          'YOUR_GOOGLE_ANDROID_CLIENT_ID.apps.googleusercontent.com',
          'YOUR_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com',
        ].some((value) => value.startsWith('YOUR_GOOGLE_'));
        if (!configured) {
          Alert.alert('Google sign-in setup', 'Add your real Google OAuth client IDs in App.js and enable Google in Firebase Console → Authentication. Email/password login and registration are ready once Email/Password is enabled in Firebase.');
          return;
        }
        promptAsync();
      }} disabled={!request || busy} accessibilityRole="button">
        <Ionicons name="logo-google" size={20} color="#4285F4"/><Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setMode(mode === 'register' ? 'login' : 'register')} style={styles.switchAuth}><Text style={styles.switchAuthText}>{mode === 'register' ? 'Already have an account? Log in' : "Don't have an account? Sign up"}</Text></TouchableOpacity>
      <Text style={styles.authFootnote}>By continuing, you agree to use Chit Chat responsibly.</Text>
    </KeyboardAvoidingView>
  );
}


function AppNavigator() {
  const [user, setUser] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, (currentUser) => setUser(currentUser)), []);
  if (user === undefined) return <View style={styles.authLoading}><ActivityIndicator size="large" color={COLORS.primary}/><Text style={styles.helperText}>Preparing Chit Chat…</Text></View>;
  if (!user) return <AuthScreen />;
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
  return <SafeAreaProvider><StatusBar barStyle="dark-content" backgroundColor={COLORS.background} /><AppNavigator /></SafeAreaProvider>;
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

  authScreen: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 26, justifyContent: 'center' },
  authLoading: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  heroCircle: { alignSelf: 'center', width: 124, height: 124, borderRadius: 62, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 22, elevation: 5 },
  brandTitle: { fontSize: 36, fontWeight: '800', color: COLORS.text, textAlign: 'center', letterSpacing: -0.5 },
  authHeading: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginTop: 22 },
  authSubtitle: { fontSize: 15, lineHeight: 22, color: COLORS.secondary, textAlign: 'center', marginTop: 8, marginBottom: 26 },
  authLogoSmall: { width: 66, height: 66, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  featureLine: { flexDirection: 'row', alignItems: 'center', marginTop: 18, paddingHorizontal: 8 },
  featureText: { color: COLORS.text, fontSize: 15, marginLeft: 12, flex: 1 },
  primaryAuthButton: { minHeight: 52, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginTop: 22, paddingHorizontal: 16 },
  primaryAuthText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryAuthButton: { minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  secondaryAuthText: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  authFootnote: { color: COLORS.secondary, fontSize: 12, textAlign: 'center', marginTop: 22, lineHeight: 18 },
  authBack: { position: 'absolute', top: 48, left: 22, padding: 8, zIndex: 2 },
  authInput: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, paddingHorizontal: 16, color: COLORS.text, marginTop: 12, fontSize: 15 },
  authDisabled: { opacity: 0.6 },
  orRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 4 },
  orLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  orText: { color: COLORS.secondary, marginHorizontal: 12, fontSize: 12, fontWeight: '600' },
  googleButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, marginTop: 12, gap: 10 },
  googleButtonText: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  switchAuth: { alignSelf: 'center', padding: 12, marginTop: 12 },
  switchAuthText: { color: COLORS.primary, fontWeight: '700', textAlign: 'center' },
  contactsTitleRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 16 },
  logoutButton: { padding: 8, marginBottom: 14 },
});
