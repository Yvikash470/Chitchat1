import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import * as ImagePicker from 'expo-image-picker';
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
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  doc,
  setDoc,
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
const storage = getStorage(firebaseApp);
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
        <TouchableOpacity onPress={openAppMenu} style={styles.logoutButton} accessibilityRole="button" accessibilityLabel="Open menu">
          <Ionicons name="ellipsis-vertical" size={24} color={COLORS.primary} />
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
        <TouchableOpacity style={styles.callAction} accessibilityLabel="Voice call" onPress={() => Alert.alert('Voice call', 'Real voice calling is not configured yet. Connect a calling provider to place calls.')}><Ionicons name="call-outline" size={22} color={COLORS.card} /></TouchableOpacity>
        <TouchableOpacity style={styles.callAction} accessibilityLabel="Video call" onPress={() => Alert.alert('Video call', 'Real video calling is not configured yet. Connect a calling provider to place calls.')}><Ionicons name="videocam-outline" size={23} color={COLORS.card} /></TouchableOpacity>
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

function openAppMenu() {
  Alert.alert('Chit Chat', 'Choose an option', [
    { text: 'New group', onPress: () => Alert.alert('New group', 'Open the Chats tab and use Create group to set up a group name. Group membership and group messaging require the group workflow to be completed before use.') },
    { text: 'Starred messages', onPress: () => Alert.alert('Starred messages', 'Message starring is not enabled in this build yet.') },
    { text: 'Linked devices', onPress: () => Alert.alert('Linked devices', 'Linked-device pairing is not supported by the current Firebase setup.') },
    { text: 'Settings / Profile', onPress: () => Alert.alert('Account', `Signed in as ${auth.currentUser?.displayName || auth.currentUser?.email || 'Chit Chat user'}\n\nUse Firebase Authentication to manage your account.`, [{ text: 'OK' }, { text: 'Log out', style: 'destructive', onPress: () => signOut(auth).catch((error) => Alert.alert('Could not log out', authErrorMessage(error))) }]) },
    { text: 'Log out', style: 'destructive', onPress: () => signOut(auth).catch((error) => Alert.alert('Could not log out', authErrorMessage(error))) },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

function Header({ title, subtitle }) {
  return (
    <View style={styles.mainHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.screenTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.screenSubtitle}>{subtitle}</Text>}
      </View>
      <TouchableOpacity onPress={openAppMenu} accessibilityRole="button" accessibilityLabel="Open menu" style={styles.menuButton}>
        <Ionicons name="ellipsis-vertical" size={24} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

function ChatsScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupModal, setGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const map = new Map();
      snapshot.docs.forEach((item) => {
        const data = item.data();
        const title = data.conversation || 'General chat';
        if (!map.has(title)) map.set(title, { id: title, title, text: data.text || '', sender: data.sender || 'User', createdAt: data.createdAt });
      });
      setConversations(Array.from(map.values()));
      setLoading(false);
    }, (error) => {
      console.warn('Could not load chats:', error);
      setLoading(false);
    });
  }, []);

  async function createGroup() {
    const cleanName = groupName.trim();
    if (!cleanName || savingGroup) return;
    setSavingGroup(true);
    try {
      const groupRef = doc(collection(db, 'groups'));
      await setDoc(groupRef, {
        name: cleanName,
        createdBy: currentUser?.uid || null,
        members: currentUser?.uid ? [currentUser.uid] : [],
        createdAt: serverTimestamp(),
      });
      setGroupModal(false);
      setGroupName('');
      Alert.alert('Group created', `“${cleanName}” was created. Add-member selection and group message routing must be enabled before it can be used as a group conversation.`);
    } catch (error) {
      Alert.alert('Could not create group', error?.message || 'Check Firestore permissions and try again.');
    } finally {
      setSavingGroup(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Header title="Chit Chat" subtitle="Your conversations" />
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.smallAction} onPress={() => navigation.navigate('Contacts')}><Ionicons name="person-add-outline" size={18} color={COLORS.primary}/><Text style={styles.smallActionText}>New chat</Text></TouchableOpacity>
        <TouchableOpacity style={styles.smallAction} onPress={() => setGroupModal(true)}><Ionicons name="people-outline" size={18} color={COLORS.primary}/><Text style={styles.smallActionText}>Create group</Text></TouchableOpacity>
      </View>
      {loading ? <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary}/><Text style={styles.helperText}>Loading chats…</Text></View> : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.contactList}
          ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="chatbubbles-outline" size={46} color={COLORS.primary}/><Text style={styles.emptyTitle}>No conversations yet</Text><Text style={styles.helperText}>Start a chat from Contacts. Your recent conversations will appear here.</Text><TouchableOpacity style={styles.primaryAuthButton} onPress={() => navigation.navigate('Contacts')}><Text style={styles.primaryAuthText}>Open contacts</Text></TouchableOpacity></View>}
          renderItem={({ item }) => <TouchableOpacity style={styles.contactRow} onPress={() => navigation.navigate('Conversation', { title: item.title })} accessibilityRole="button"><View style={styles.avatar}><Ionicons name="chatbubble" size={20} color={COLORS.primary}/></View><View style={styles.contactDetails}><Text style={styles.contactName}>{item.title}</Text><Text style={styles.contactNumber} numberOfLines={1}>{item.text || 'Open conversation'}</Text></View><Ionicons name="chevron-forward" size={20} color={COLORS.secondary}/></TouchableOpacity>}
        />
      )}
      <Modal visible={groupModal} transparent animationType="fade" onRequestClose={() => setGroupModal(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.emptyTitle}>Create a group</Text><Text style={styles.helperText}>Choose a group name to create its Firestore record.</Text><TextInput style={styles.authInput} placeholder="Group name" placeholderTextColor={COLORS.secondary} value={groupName} onChangeText={setGroupName} maxLength={60} autoFocus/><View style={styles.modalActions}><TouchableOpacity onPress={() => setGroupModal(false)} style={styles.modalCancel}><Text style={styles.smallActionText}>Cancel</Text></TouchableOpacity><TouchableOpacity onPress={createGroup} disabled={!groupName.trim() || savingGroup} style={styles.modalCreate}>{savingGroup ? <ActivityIndicator color="#fff"/> : <Text style={styles.primaryAuthText}>Create</Text>}</TouchableOpacity></View></View></View>
      </Modal>
    </View>
  );
}

function StatusScreen() {
  const [statuses, setStatuses] = useState([]);
  const [statusText, setStatusText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  useEffect(() => {
    const q = query(collection(db, 'statuses'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => { setStatuses(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); }, (error) => { console.warn('Status listener failed:', error); setLoading(false); });
  }, []);
  async function postStatus(mediaOnly = false) {
    const text = statusText.trim();
    if (!text && !mediaOnly) return;
    if (posting) return;
    setPosting(true);
    try {
      await addDoc(collection(db, 'statuses'), { text, mediaUrl: null, mediaType: null, uid: auth.currentUser?.uid || null, author: auth.currentUser?.displayName || auth.currentUser?.email || 'Chit Chat user', createdAt: serverTimestamp() });
      setStatusText('');
    } catch (error) { Alert.alert('Status not posted', error?.message || 'Check your Firestore rules and internet connection.'); }
    finally { setPosting(false); }
  }
  async function chooseMedia() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { Alert.alert('Permission needed', 'Allow photo and video access to post media status.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsEditing: false, quality: 0.8, videoMaxDuration: 30 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPosting(true);
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const ext = (asset.uri.split('.').pop() || (asset.type === 'video' ? 'mp4' : 'jpg')).split('?')[0];
      const path = `statuses/${auth.currentUser?.uid || 'anonymous'}/${Date.now()}.${ext}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, blob, { contentType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg') });
      const mediaUrl = await getDownloadURL(fileRef);
      await addDoc(collection(db, 'statuses'), { text: statusText.trim(), mediaUrl, mediaType: asset.type || 'image', uid: auth.currentUser?.uid || null, author: auth.currentUser?.displayName || auth.currentUser?.email || 'Chit Chat user', createdAt: serverTimestamp() });
      setStatusText('');
      Alert.alert('Status posted', 'Your media status was uploaded successfully.');
    } catch (error) {
      console.warn('Media status upload failed:', error);
      Alert.alert('Could not post media status', error?.message || 'Check Firebase Storage setup and rules.');
    } finally { setPosting(false); }
  }
  return <View style={styles.screen}><Header title="Status" subtitle="Updates from your friends"/><View style={styles.statusComposer}><TextInput style={styles.statusInput} value={statusText} onChangeText={setStatusText} placeholder="What's on your mind?" placeholderTextColor={COLORS.secondary} maxLength={500}/><TouchableOpacity style={styles.mediaButton} accessibilityLabel="Add photo or video status" onPress={chooseMedia}><Ionicons name="image-outline" size={21} color={COLORS.primary}/></TouchableOpacity><TouchableOpacity style={[styles.sendButton, !statusText.trim() && styles.sendButtonDisabled]} disabled={!statusText.trim() || posting} onPress={() => postStatus(false)}>{posting ? <ActivityIndicator color="#fff"/> : <Ionicons name="send" size={18} color="#fff"/>}</TouchableOpacity></View><Text style={styles.sectionLabel}>Recent updates</Text>{loading ? <View style={styles.centered}><ActivityIndicator color={COLORS.primary}/></View> : <FlatList data={statuses} keyExtractor={(item) => item.id} contentContainerStyle={styles.contactList} ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="radio-button-on-outline" size={44} color={COLORS.primary}/><Text style={styles.emptyTitle}>No status updates yet</Text><Text style={styles.helperText}>Post text, a photo, or a short video. Firebase Storage must be enabled for media status.</Text></View>} renderItem={({ item }) => <View style={styles.statusCard}><View style={styles.avatar}><Ionicons name="person" size={20} color={COLORS.primary}/></View><View style={styles.contactDetails}><Text style={styles.contactName}>{item.author || 'Chit Chat user'}</Text>{item.text ? <Text style={styles.statusBody}>{item.text}</Text> : null}{item.mediaUrl && item.mediaType !== 'video' ? <Image source={{ uri: item.mediaUrl }} style={styles.statusMedia} resizeMode="cover" /> : null}{item.mediaUrl && item.mediaType === 'video' ? <Text style={styles.mediaLink} onPress={() => Linking.openURL(item.mediaUrl).catch(() => Alert.alert('Cannot open video', 'This video URL could not be opened on this device.'))}>▶ Open video status</Text> : null}</View></View>}/>}</View>;
}

function CallsScreen() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const q = query(collection(db, 'callLogs'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => { setCalls(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); }, (error) => { console.warn('Call history listener failed:', error); setLoading(false); });
  }, []);
  return <View style={styles.screen}><Header title="Calls" subtitle="Voice and video call history"/>{loading ? <View style={styles.centered}><ActivityIndicator color={COLORS.primary}/></View> : <FlatList data={calls} keyExtractor={(item) => item.id} contentContainerStyle={styles.contactList} ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="call-outline" size={48} color={COLORS.primary}/><Text style={styles.emptyTitle}>No calls yet</Text><Text style={styles.helperText}>Voice and video calls need a calling provider (such as Agora or a WebRTC service) and credentials. The app currently does not place real calls.</Text></View>} renderItem={({ item }) => <View style={styles.contactRow}><View style={styles.avatar}><Ionicons name={item.type === 'video' ? 'videocam' : 'call'} size={20} color={COLORS.primary}/></View><View style={styles.contactDetails}><Text style={styles.contactName}>{item.contactName || 'Contact'}</Text><Text style={styles.contactNumber}>{item.type === 'video' ? 'Video call' : 'Voice call'} · {item.status || 'Call record'}</Text></View></View>}/>}</View>;
}

function MainTabs() {
  const tabIcons = { Chats: 'chatbubbles', Status: 'radio-button-on', Calls: 'call', Contacts: 'people' };
  return (
    <Tab.Navigator
      initialRouteName="Chats"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: COLORS.card, borderTopColor: COLORS.border, height: 62, paddingTop: 6, paddingBottom: 6 },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.secondary,
        tabBarIcon: ({ focused, color, size }) => <Ionicons name={`${tabIcons[route.name]}${focused ? '' : '-outline'}`} size={size || 22} color={color} />,
        tabBarLabel: route.name,
      })}
    >
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Status" component={StatusScreen} />
      <Tab.Screen name="Calls" component={CallsScreen} />
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
  mainHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingRight: 16 },
  menuButton: { padding: 8 },
  callAction: { padding: 7, marginLeft: 4 },
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
  actionRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  smallAction: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, borderRadius: 22, paddingVertical: 9, paddingHorizontal: 13 },
  smallActionText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: COLORS.card, borderRadius: 18, padding: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 14, gap: 12 },
  modalCancel: { paddingVertical: 12, paddingHorizontal: 10 },
  modalCreate: { minWidth: 90, minHeight: 44, paddingHorizontal: 18, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  statusComposer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, marginBottom: 18 },
  statusInput: { flex: 1, minHeight: 46, backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, color: COLORS.text },
  mediaButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1, borderRadius: 12 },
  mediaLink: { color: COLORS.primary, fontWeight: '700', marginTop: 8 },
  statusMedia: { width: '100%', height: 190, borderRadius: 12, marginTop: 10, backgroundColor: '#E2EEE7' },
  sectionLabel: { color: COLORS.secondary, fontWeight: '700', paddingHorizontal: 20, marginBottom: 8 },
  statusCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1, borderRadius: 14, padding: 13, marginBottom: 10 },
  statusBody: { color: COLORS.text, fontSize: 15, marginTop: 4, lineHeight: 21 },
});
