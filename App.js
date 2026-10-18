const ComponentFunction = function() {
  const React = require('react');
  const { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar, Alert } = require('react-native');
  const { Ionicons } = require('@expo/vector-icons');
  const { createBottomTabNavigator } = require('@react-navigation/bottom-tabs');
  const { createStackNavigator } = require('@react-navigation/stack');
  const { useSafeAreaInsets } = require('react-native-safe-area-context');
  const Contacts = require('expo-contacts');

  const { initializeApp, getApps } = require('firebase/app');
  const { getFirestore, collection, addDoc, query, onSnapshot, orderBy } = require('firebase/firestore');

  const firebaseConfig = {
    apiKey: "AIzaSyCO9r_HjdXGbA8WeyJyd1G1gkxEVyrn09s",
    authDomain: "chitchat-app-107ba.firebaseapp.com",
    projectId: "chitchat-app-107ba",
    storageBucket: "chitchat-app-107ba.firebasestorage.app",
    messagingSenderId: "637077629710",
    appId: "1:637077629710:web:ab1c525ae970701279055f",
    measurementId: "G-BJQLGSW9D4"
  };

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  const db = getFirestore(app);

  var PRIMARY = '#168A58';
  var BACKGROUND = '#F1F8F4';
  var CARD = '#FFFFFF';
  var TEXT = '#16352A';
  var SECONDARY = '#526B60';
  var BORDER = '#BED8C9';
  var TAB_MENU_HEIGHT = 49;

  var Tab = createBottomTabNavigator();
  var Stack = createStackNavigator();

  var ContactsScreen = function(props) {
    var [contacts, setContacts] = React.useState([]);
    var insets = useSafeAreaInsets();

    React.useEffect(function() {
      (async function() {
        try {
          var { status } = await Contacts.requestPermissionsAsync();
          if (status === 'granted') {
            var { data } = await Contacts.getContactsAsync({
              fields: [Contacts.Fields.PhoneNumbers],
            });
            if (data && data.length > 0) {
              setContacts(data);
            }
          }
        } catch (e) {
          console.log(e);
        }
      })();
    }, []);

    return React.createElement(View, { style: { flex: 1, backgroundColor: BACKGROUND, paddingTop: insets.top + 20 } },
      React.createElement(Text, { style: { fontSize: 22, fontWeight: '700', color: TEXT, paddingHorizontal: 20, marginBottom: 15 } }, 'Phone Contacts'),
      React.createElement(ScrollView, { contentContainerStyle: { paddingHorizontal: 20 } },
        contacts.map(function(item, index) {
          return React.createElement(TouchableOpacity, {
            key: index,
            style: { backgroundColor: CARD, padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
            onPress: function() {
              props.navigation.navigate('Conversation', { title: item.name || 'Chat' });
            }
          },
            React.createElement(Text, { style: { fontSize: 16, fontWeight: '700', color: TEXT } }, item.name || 'Unknown'),
            React.createElement(Text, { style: { fontSize: 13, color: SECONDARY } }, item.phoneNumbers?.[0]?.number || 'No number')
          );
        })
      )
    );
  };

  var ConversationScreen = function(props) {
    var title = props.route?.params?.title || 'Chat';
    var [messages, setMessages] = React.useState([]);
    var [text, setText] = React.useState('');
    var insets = useSafeAreaInsets();

    React.useEffect(function() {
      try {
        var q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
        var unsubscribe = onSnapshot(q, function(snapshot) {
          var msgs = [];
          snapshot.forEach(function(doc) {
            msgs.push(doc.data());
          });
          setMessages(msgs);
        }, function(error) {
          console.log(error);
        });
        return function() { unsubscribe(); };
      } catch (e) {
        console.log(e);
      }
    }, []);

    var sendMessage = async function() {
      if (!text.trim()) return;
      try {
        await addDoc(collection(db, 'messages'), {
          text: text,
          sender: 'Me',
          createdAt: new Date().toISOString()
        });
        setText('');
      } catch (error) {
        Alert.alert('Error', error.message);
      }
    };

    return React.createElement(View, { style: { flex: 1, backgroundColor: BACKGROUND } },
      React.createElement(View, { style: { backgroundColor: PRIMARY, paddingVertical: 15, paddingHorizontal: 20, paddingTop: insets.top + 10, flexDirection: 'row', alignItems: 'center' } },
        React.createElement(TouchableOpacity, { onPress: function() { props.navigation.goBack(); } },
          React.createElement(Ionicons, { name: 'arrow-back', size: 24, color: CARD })
        ),
        React.createElement(Text, { style: { color: CARD, fontSize: 18, fontWeight: '700', marginLeft: 15 } }, title)
      ),
      React.createElement(ScrollView, { contentContainerStyle: { padding: 20 } },
        messages.map(function(msg, index) {
          return React.createElement(View, { key: index, style: { backgroundColor: CARD, padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: BORDER } },
            React.createElement(Text, { style: { fontSize: 12, color: SECONDARY, fontWeight: '600' } }, msg.sender),
            React.createElement(Text, { style: { fontSize: 14, color: TEXT, marginTop: 2 } }, msg.text)
          );
        })
      ),
      React.createElement(View, { style: { flexDirection: 'row', padding: 10, backgroundColor: CARD, borderTopWidth: 1, borderColor: BORDER, paddingBottom: insets.bottom + 5 } },
        React.createElement(TextInput, {
          style: { flex: 1, backgroundColor: BACKGROUND, borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 15, height: 40, color: TEXT },
          placeholder: 'Type a message...',
          placeholderTextColor: SECONDARY,
          value: text,
          onChangeText: setText
        }),
        React.createElement(TouchableOpacity, {
          style: { backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center', width: 40, height: 40, borderRadius: 20, marginLeft: 8 },
          onPress: sendMessage
        },
          React.createElement(Ionicons, { name: 'send', size: 18, color: CARD })
        )
      )
    );
  };

  var MainTabs = function() {
    return React.createElement(Tab.Navigator, {
      screenOptions: function() {
        return {
          headerShown: false,
          tabBarStyle: { backgroundColor: CARD, borderTopColor: BORDER, height: TAB_MENU_HEIGHT },
          tabBarActiveTintColor: PRIMARY,
          tabBarInactiveTintColor: SECONDARY,
          tabBarIcon: function(opts) {
            return React.createElement(Ionicons, { name: opts.focused ? 'people' : 'people-outline', size: 22, color: opts.color });
          }
        };
      }
    },
      React.createElement(Tab.Screen, { name: 'Contacts', component: ContactsScreen })
    );
  };

  var AppNavigator = function() {
    return React.createElement(Stack.Navigator, { screenOptions: { headerShown: false } },
      React.createElement(Stack.Screen, { name: 'Main', component: MainTabs }),
      React.createElement(Stack.Screen, { name: 'Conversation', component: ConversationScreen })
    );
  };

  return React.createElement(AppNavigator, null);
};
