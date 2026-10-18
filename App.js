const ComponentFunction = function() {
  // @section:imports @depends:[]
  const React = require('react');
  const { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, StatusBar, Platform, Alert, useWindowDimensions } = require('react-native');
  const { Ionicons } = require('@expo/vector-icons'); // FIXED IMPORT
  const { createBottomTabNavigator } = require('@react-navigation/bottom-tabs');
  const { createStackNavigator } = require('@react-navigation/stack');
  const { useSafeAreaInsets } = require('react-native-safe-area-context');
  const { useQuery, useMutation, useStorage, seedSampleRows, useCamera, useShare } = require('platform-hooks');
  
  // Firebase Initialization & Config
  const { initializeApp } = require('firebase/app');
  const { getAnalytics } = require('firebase/analytics');

  const firebaseConfig = {
    apiKey: "AIzaSyCO9r_HjdXGbA8WeyJyd1G1gkxEVyrn09s",
    authDomain: "chitchat-app-107ba.firebaseapp.com",
    projectId: "chitchat-app-107ba",
    storageBucket: "chitchat-app-107ba.firebasestorage.app",
    messagingSenderId: "637077629710",
    appId: "1:637077629710:web:ab1c525ae970701279055f",
    measurementId: "G-BJQLGSW9D4"
  };

  const app = initializeApp(firebaseConfig);
  const analytics = Platform.OS === 'web' ? getAnalytics(app) : null;
  // @end:imports

  // @section:theme @depends:[]
  var PRIMARY = '#168A58';
  var ACCENT = '#35B779';
  var BACKGROUND = '#F1F8F4';
  var CARD = '#FFFFFF';
  var TEXT = '#16352A';
  var SECONDARY = '#526B60';
  var BORDER = '#BED8C9';
  var DARK = '#10643F';
  var PALE = '#DDF3E6';
  var TAB_MENU_HEIGHT = Platform.OS === 'web' ? 56 : 49;
  var SCROLL_EXTRA_PADDING = 16;
  var FAB_SPACING = 16;
  var DEFAULT_PROFILE = { displayName: '', photoUri: '' };
  var visualDesign = 'Modern green-and-white Android messenger with honest message states, generous touch targets, and clear conversation flow.';
  // @end:theme

  // @section:navigation-setup @depends:[]
  var Tab = createBottomTabNavigator();
  var Stack = createStackNavigator();
  // @end:navigation-setup

  // @section:ThemeContext @depends:[theme]
  var ThemeContext = React.createContext(null);
  var ThemeProvider = function(props) {
    var darkState = React.useState(false);
    return React.createElement(ThemeContext.Provider, {
      value: {
        theme: { colors: { primary: PRIMARY, accent: ACCENT, background: BACKGROUND, card: CARD, textPrimary: TEXT, textSecondary: SECONDARY } },
        darkMode: darkState[0],
        toggleDarkMode: function() { darkState[1](!darkState[0]); },
        visualDesign: visualDesign
      }
    }, props.children);
  };
  var useTheme = function() { return React.useContext(ThemeContext); };
  // @end:ThemeContext

  // @section:sample-data @depends:[]
  var SAMPLE_ROWS = {
    conversations: [
      { title: 'Maya Chen', conversation_kind: 'direct', updated_at: '@day(0 09:42)' },
      { title: 'Weekend plans', conversation_kind: 'group', updated_at: '@day(-1 18:20)' },
      { title: 'Jordan Lee', conversation_kind: 'direct', updated_at: '@day(-2 14:15)' },
      { title: 'The book club', conversation_kind: 'group', updated_at: '@day(-4 20:00)' }
    ],
    messages: [
      { conversation_id: 'sample-conversations-1', message_kind: 'text', body_text: 'The little café on Willow Street looks perfect for Saturday.', delivery_status: 'delivered', direction: 'incoming', created_at: '@day(-1 16:30)' },
      { conversation_id: 'sample-conversations-1', message_kind: 'text', body_text: 'I love that idea! Shall we meet at 11?', delivery_status: 'sent', direction: 'outgoing', created_at: '@day(0 09:42)' },
      { conversation_id: 'sample-conversations-2', message_kind: 'text', body_text: 'I can bring snacks for the hike.', delivery_status: 'delivered', direction: 'incoming', sender_name: 'Priya', created_at: '@day(-1 17:10)' },
      { conversation_id: 'sample-conversations-2', message_kind: 'text', body_text: 'Great! Let’s meet at the trailhead.', delivery_status: 'sent', direction: 'outgoing', created_at: '@day(-1 18:20)' },
      { conversation_id: 'sample-conversations-3', message_kind: 'text', body_text: 'Sending you the details later today.', delivery_status: 'delivered', direction: 'incoming', created_at: '@day(-2 14:15)' },
      { conversation_id: 'sample-conversations-4', message_kind: 'text', body_text: 'What did everyone think of the ending?', delivery_status: 'delivered', direction: 'incoming', sender_name: 'Sam', created_at: '@day(-4 20:00)' }
    ]
  };
  // @end:sample-data

  // @section:shared-ui @depends:[styles]
  var showError = function(message) {
    Platform.OS === 'web' ? window.alert(message) : Alert.alert('Something went wrong', message);
  };
  var formatTime = function(value) {
    if (!value) return '';
    var date = new Date(value);
    return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };
  var Avatar = function(props) {
    return props.uri
      ? React.createElement(Image, { source: { uri: props.uri }, style: styles.avatar, componentId: props.componentId + '-image' })
      : React.createElement(View, { style: styles.avatarFallback, componentId: props.componentId + '-fallback' },
          React.createElement(Text, { style: styles.avatarInitial, componentId: props.componentId + '-initial' }, (props.name || '?').slice(0, 1).toUpperCase()));
  };
  var StatusLabel = function(props) {
    var status = props.status === 'delivered' ? 'Delivered' : props.status === 'sent' ? 'Saved on this device' : props.status === 'failed' ? 'Failed' : 'Pending';
    var icon = props.status === 'delivered' ? 'checkmark-done' : props.status === 'sent' ? 'checkmark' : props.status === 'failed' ? 'alert-circle-outline' : 'time-outline';
    return React.createElement(View, { style: styles.statusRow, componentId: props.componentId },
      React.createElement(Ionicons, { name: icon, size: 14, color: SECONDARY, componentId: props.componentId + '-icon' }),
      React.createElement(Text, { style: styles.micro, componentId: props.componentId + '-text' }, status));
  };
  // @end:shared-ui

  // @section:ChatsScreen @depends:[ThemeContext,styles,shared-ui]
  var ChatsScreen = function(props) {
    var insets = useSafeAreaInsets();
    var windowHeight = useWindowDimensions().height;
    var themeContext = useTheme();
    var theme = themeContext.theme;
    var query = useQuery('conversations', {}, { column: 'updated_at', ascending: false });
    var messageQuery = useQuery('messages');
    var createConversation = useMutation('conversations', 'insert');
    var titleState = React.useState('');
    var groupState = React.useState(false);
    var composerState = React.useState(false);
    var rows = query.data;
    var saveConversation = function() {
      var title = titleState[0].trim();
      if (!title) { showError('Enter a conversation name.'); return; }
      createConversation.mutate({ title: title, conversation_kind: groupState[0] ? 'group' : 'direct', updated_at: new Date().toISOString() })
        .then(function() {
          titleState[1]('');
          composerState[1](false);
          query.refetch();
        }).catch(function(error) { showError(error.message || 'Could not create conversation.'); });
    };
    return React.createElement(View, { style: styles.screen, componentId: 'chats-screen' },
      React.createElement(StatusBar, { backgroundColor: PRIMARY, barStyle: 'light-content', componentId: 'chats-status-bar' }),
      React.createElement(View, { style: [styles.hero, { paddingTop: insets.top + 20 }], componentId: 'chats-header' },
        React.createElement(Text, { style: styles.heroEyebrow, componentId: 'chats-eyebrow' }, 'YOUR CONVERSATIONS'),
        React.createElement(Text, { style: styles.heroTitle, componentId: 'chats-title' }, 'Chit Chat'),
        React.createElement(Text, { style: styles.heroSubtitle, componentId: 'chats-subtitle' }, 'A little closer, one message at a time.')),
      React.createElement(ScrollView, {
        style: { height: windowHeight - insets.top - insets.bottom - 160, overflow: 'auto' },
        contentContainerStyle: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: TAB_MENU_HEIGHT + insets.bottom + SCROLL_EXTRA_PADDING },
        componentId: 'chats-scroll'
      },
        React.createElement(View, { style: styles.sectionRow, componentId: 'chats-section-row' },
          React.createElement(Text, { style: styles.sectionTitle, componentId: 'chats-section-title' }, 'Messages'),
          React.createElement(Text, { style: styles.countLabel, componentId: 'chats-count' }, rows.length + ' chats')),
        rows.length === 0
          ? React.createElement(View, { style: styles.emptyCard, componentId: 'chats-empty' },
              React.createElement(Ionicons, { name: 'chatbubbles-outline', size: 32, color: PRIMARY, componentId: 'chats-empty-icon' }),
              React.createElement(Text, { style: styles.rowTitle, componentId: 'chats-empty-title' }, 'No conversations yet'),
              React.createElement(Text, { style: styles.secondary, componentId: 'chats-empty-copy' }, 'Start a conversation to make this space yours.'))
          : rows.map(function(item, index) {
              var latest = messageQuery.data.filter(function(message) { return message.conversation_id === item.id; }).slice(-1)[0];
              return React.createElement(TouchableOpacity, {
                key: String(item.id || index),
                style: styles.chatRow,
                onPress: function() { props.navigation.navigate('Conversation', { conversationId: item.id, title: item.title || 'Conversation' }); },
                componentId: 'chats-row-' + index
              },
                React.createElement(Avatar, { name: item.title, componentId: 'chats-avatar-' + index }),
                React.createElement(View, { style: styles.rowBody, componentId: 'chats-row-body-' + index },
                  React.createElement(View, { style: styles.rowTop, componentId: 'chats-row-top-' + index },
                    React.createElement(Text, { style: styles.rowTitle, numberOfLines: 1, componentId: 'chats-row-title-' + index }, item.title || 'Untitled conversation'),
                    React.createElement(Text, { style: styles.micro, componentId: 'chats-row-time-' + index }, formatTime(latest?.created_at || item.updated_at))),
                  React.createElement(Text, { style: styles.secondary, numberOfLines: 1, componentId: 'chats-row-preview-' + index },
                    latest ? (latest.message_kind === 'photo' ? 'Photo' : latest.body_text || 'Message') : (item.conversation_kind === 'group' ? 'Group conversation' : 'Say hello')),
                  latest?.direction === 'outgoing'
                    ? React.createElement(StatusLabel, { status: latest.delivery_status, componentId: 'chats-row-status-' + index })
                    : React.createElement(Text, { style: styles.micro, componentId: 'chats-row-kind-' + index }, item.conversation_kind === 'group' ? 'GROUP' : 'DIRECT'))); }),
        composerState[0] ? React.createElement(View, { style: styles.createCard, componentId: 'chats-create-card' },
          React.createElement(Text, { style: styles.cardTitle, componentId: 'chats-create-title' }, 'New conversation'),
          React.createElement(TextInput, {
            style: styles.input, value: titleState[0], onChangeText: titleState[1],
            placeholder: groupState[0] ? 'Group name' : 'Contact name', placeholderTextColor: SECONDARY,
            autoCapitalize: 'words', autoCorrect: false, componentId: 'chats-name-input'
          }),
          React.createElement(View, { style: styles.choiceRow, componentId: 'chats-kind-row' },
            React.createElement(TouchableOpacity, { style: [styles.choice, !groupState[0] && styles.choiceActive], onPress: function() { groupState[1](false); }, componentId: 'chats-direct-choice' },
              React.createElement(Text, { style: !groupState[0] ? styles.choiceTextActive : styles.choiceText, componentId: 'chats-direct-text' }, 'One-to-one')),
            React.createElement(TouchableOpacity, { style: [styles.choice, groupState[0] && styles.choiceActive], onPress: function() { groupState[1](true); }, componentId: 'chats-group-choice' },
              React.createElement(Text, { style: groupState[0] ? styles.choiceTextActive : styles.choiceText, componentId: 'chats-group-text' }, 'Group'))),
          React.createElement(TouchableOpacity, { style: styles.primaryButton, onPress: saveConversation, componentId: 'chats-create-button' },
            React.createElement(Text, { style: styles.buttonText, componentId: 'chats-create-button-text' }, 'Create chat'))
        ) : null,
        React.createElement(TouchableOpacity, {
          style: styles.outlineButton, onPress: function() { composerState[1](!composerState[0]); },
          componentId: 'chats-new-button'
        }, React.createElement(Ionicons, { name: composerState[0] ? 'close' : 'add', size: 22, color: PRIMARY, componentId: 'chats-new-icon' }),
          React.createElement(Text, { style: styles.outlineButtonText, componentId: 'chats-new-text' }, composerState[0] ? 'Cancel' : 'New conversation')),
        React.createElement(Text, { style: styles.notice, componentId: 'chats-local-notice' }, 'On-device preview · Chats are not synced to other people.')
      ));
  };
  // @end:ChatsScreen

  // @section:ConversationScreen @depends:[ThemeContext,styles,shared-ui]
  var ConversationScreen = function(props) {
    var insets = useSafeAreaInsets();
    var windowHeight = useWindowDimensions().height;
    var themeContext = useTheme();
    var theme = themeContext.theme;
    var conversationId = props.route?.params?.conversationId || null;
    var title = props.route?.params?.title || 'Conversation';
    var query = useQuery('messages');
    var insertMessage = useMutation('messages', 'insert');
    var camera = useCamera();
    var shareHook = useShare();
    var draftState = React.useState('');
    var rows = query.data.filter(function(item) { return item.conversation_id === conversationId; })
      .sort(function(a, b) { return new Date(a.created_at || 0) - new Date(b.created_at || 0); });
    var sendMessage = function(kind, uri) {
      var body = draftState[0].trim();
      if (kind === 'text' && !body) return;
      if (!conversationId) { showError('Open a conversation first.'); return; }
      insertMessage.mutate({
        conversation_id: conversationId, message_kind: kind, body_text: kind === 'text' ? body : null,
        media_url: kind === 'photo' ? uri : null, direction: 'outgoing', delivery_status: 'pending',
        created_at: new Date().toISOString()
      }).then(function() {
        if (kind === 'text') draftState[1]('');
        query.refetch();
      }).catch(function(error) { showError(error.message || 'Could not save message.'); });
    };
    var pickPhoto = function() {
      camera.pickImage().then(function(result) {
        if (result.error) showError(result.error);
      }).catch(function(error) { showError(error.message); });
    };
    var takePhoto = function() {
      camera.takePhoto().then(function(result) {
        if (result.error) showError(result.error);
      }).catch(function(error) { showError(error.message); });
    };
    return React.createElement(View, { style: styles.screen, componentId: 'conversation-screen' },
      React.createElement(StatusBar, { backgroundColor: PRIMARY, barStyle: 'light-content', componentId: 'conversation-status-bar' }),
      React.createElement(View, { style: [styles.chatHeader, { paddingTop: insets.top }], componentId: 'conversation-header' },
        React.createElement(TouchableOpacity, { style: styles.iconButton, onPress: function() { props.navigation.goBack(); }, componentId: 'conversation-back' },
          React.createElement(Ionicons, { name: 'arrow-back', size: 24, color: CARD, componentId: 'conversation-back-icon' })),
        React.createElement(View, { style: styles.headerName, componentId: 'conversation-header-name' },
          React.createElement(Text, { style: styles.headerTitle, numberOfLines: 1, componentId: 'conversation-title' }, title),
          React.createElement(Text, { style: styles.headerMeta, componentId: 'conversation-meta' }, 'On-device conversation')),
        React.createElement(TouchableOpacity, { style: styles.iconButton, onPress: function() { props.navigation.navigate('Calls', { title: title }); }, componentId: 'conversation-call' },
          React.createElement(Ionicons, { name: 'call-outline', size: 24, color: CARD, componentId: 'conversation-call-icon' }))),
      React.createElement(ScrollView, {
        style: { height: windowHeight - insets.top - insets.bottom - 210, overflow: 'auto' },
        contentContainerStyle: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 32 },
        componentId: 'conversation-messages'
      },
        rows.length === 0
          ? React.createElement(View, { style: styles.emptyCard, componentId: 'conversation-empty' },
              React.createElement(Text, { style: styles.rowTitle, componentId: 'conversation-empty-title' }, 'A fresh conversation'),
              React.createElement(Text, { style: styles.secondary, componentId: 'conversation-empty-copy' }, 'Messages you write here stay on this device.'))
          : rows.map(function(item, index) {
              var outgoing = item.direction === 'outgoing';
              return React.createElement(View, { key: String(item.id || index), style: [styles.messageWrap, outgoing ? styles.messageOut : styles.messageIn], componentId: 'conversation-message-' + index },
                !outgoing && item.sender_name ? React.createElement(Text, { style: styles.senderName, componentId: 'conversation-sender-' + index }, item.sender_name) : null,
                React.createElement(View, { style: [styles.bubble, outgoing ? styles.bubbleOut : styles.bubbleIn], componentId: 'conversation-bubble-' + index },
                  item.message_kind === 'photo' && item.media_url
                    ? React.createElement(Image, { source: { uri: item.media_url }, style: styles.messagePhoto, resizeMode: 'cover', componentId: 'conversation-photo-' + index })
                    : React.createElement(Text, { style: styles.body, componentId: 'conversation-body-' + index }, item.body_text || 'Message')),
                React.createElement(View, { style: styles.messageMeta, componentId: 'conversation-meta-' + index },
                  React.createElement(Text, { style: styles.micro, componentId: 'conversation-time-' + index }, formatTime(item.created_at)),
                  outgoing ? React.createElement(StatusLabel, { status: item.delivery_status, componentId: 'conversation-status-' + index }) : null));
            })),
      camera.photo?.uri ? React.createElement(View, { style: styles.photoPreview, componentId: 'conversation-photo-preview' },
        React.createElement(Image, { source: { uri: camera.photo.uri }, style: styles.previewImage, componentId: 'conversation-preview-image' }),
        React.createElement(Text, { style: styles.secondary, componentId: 'conversation-preview-label' }, 'Photo ready to save'),
        React.createElement(TouchableOpacity, { style: styles.smallAction, onPress: function() { sendMessage('photo', camera.photo.uri); }, componentId: 'conversation-send-photo' },
          React.createElement(Text, { style: styles.smallActionText, componentId: 'conversation-send-photo-text' }, 'Save photo'))) : null,
      camera.error ? React.createElement(Text, { style: styles.errorText, componentId: 'conversation-camera-error' }, camera.error) : null,
      React.createElement(View, { style: [styles.composer, { paddingBottom: insets.bottom + 8 }], componentId: 'conversation-composer' },
        React.createElement(TouchableOpacity, { style: styles.composerIcon, onPress: pickPhoto, componentId: 'conversation-gallery-button' },
          React.createElement(Ionicons, { name: 'image-outline', size: 24, color: PRIMARY, componentId: 'conversation-gallery-icon' })),
        React.createElement(TouchableOpacity, { style: styles.composerIcon, onPress: takePhoto, componentId: 'conversation-camera-button' },
          React.createElement(Ionicons, { name: 'camera-outline', size: 24, color: PRIMARY, componentId: 'conversation-camera-icon' })),
        React.createElement(TextInput, {
          style: styles.messageInput, value: draftState[0], onChangeText: draftState[1],
          placeholder: 'Write a message', placeholderTextColor: SECONDARY,
          multiline: true, numberOfLines: 2, textAlignVertical: 'center',
          autoCapitalize: 'sentences', autoCorrect: true, componentId: 'conversation-input'
        }),
        React.createElement(TouchableOpacity, { style: styles.sendButton, onPress: function() { sendMessage('text', null); }, componentId: 'conversation-send-button' },
          React.createElement(Ionicons, { name: 'arrow-up', size: 20, color: CARD, componentId: 'conversation-send-icon' }))
      ));
  };
  // @end:ConversationScreen

  // @section:CallsScreen @depends:[ThemeContext,styles,shared-ui]
  var CallsScreen = function(props) {
    var insets = useSafeAreaInsets();
    var windowHeight = useWindowDimensions().height;
    var themeContext = useTheme();
    var title = props.route?.params?.title || 'Voice Call';
    var callState = React.useState('connecting');
    var durationState = React.useState(0);
    React.useEffect(function() {
      var timer = setTimeout(function() { callState[1]('connected'); }, 2000);
      return function() { clearTimeout(timer); };
    }, []);
    React.useEffect(function() {
      if (callState[0] !== 'connected') return;
      var interval = setInterval(function() { durationState[1](function(prev) { return prev + 1; }); }, 1000);
      return function() { clearInterval(interval); };
    }, [callState[0]]);
    var formatDuration = function(sec) {
      var m = Math.floor(sec / 60);
      var s = sec % 60;
      return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
    };
    return React.createElement(View, { style: [styles.screen, { backgroundColor: DARK }], componentId: 'calls-screen' },
      React.createElement(StatusBar, { backgroundColor: DARK, barStyle: 'light-content', componentId: 'calls-status-bar' }),
      React.createElement(View, { style: [styles.callHero, { paddingTop: insets.top + 40 }], componentId: 'calls-hero' },
        React.createElement(Avatar, { name: title, componentId: 'calls-avatar' }),
        React.createElement(Text, { style: styles.callTitle, componentId: 'calls-title' }, title),
        React.createElement(Text, { style: styles.callStatus, componentId: 'calls-status' }, callState[0] === 'connected' ? formatDuration(durationState[0]) : 'Connecting audio...')),
      React.createElement(View, { style: [styles.callActions, { paddingBottom: insets.bottom + 40 }], componentId: 'calls-actions' },
        React.createElement(TouchableOpacity, { style: styles.callButtonDanger, onPress: function() { props.navigation.goBack(); }, componentId: 'calls-end' },
          React.createElement(Ionicons, { name: 'call', size: 28, color: CARD, componentId: 'calls-end-icon' }))));
  };
  // @end:CallsScreen

  // @section:SettingsScreen @depends:[ThemeContext,styles]
  var SettingsScreen = function(props) {
    var insets = useSafeAreaInsets();
    var windowHeight = useWindowDimensions().height;
    var themeContext = useTheme();
    var storage = useStorage('profile', DEFAULT_PROFILE);
    var profile = storage.data || DEFAULT_PROFILE;
    var nameState = React.useState(profile.displayName || '');
    var saveProfile = function() {
      storage.save({ displayName: nameState[0].trim(), photoUri: profile.photoUri })
        .then(function() { Alert.alert('Saved', 'Profile updated successfully.'); })
        .catch(function(error) { showError(error.message || 'Could not save profile.'); });
    };
    return React.createElement(View, { style: styles.screen, componentId: 'settings-screen' },
      React.createElement(StatusBar, { backgroundColor: PRIMARY, barStyle: 'light-content', componentId: 'settings-status-bar' }),
      React.createElement(View, { style: [styles.hero, { paddingTop: insets.top + 20 }], componentId: 'settings-header' },
        React.createElement(Text, { style: styles.heroEyebrow, componentId: 'settings-eyebrow' }, 'PREFERENCES'),
        React.createElement(Text, { style: styles.heroTitle, componentId: 'settings-title' }, 'Settings')),
      React.createElement(ScrollView, {
        style: { height: windowHeight - insets.top - insets.bottom - 160, overflow: 'auto' },
        contentContainerStyle: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: TAB_MENU_HEIGHT + insets.bottom + SCROLL_EXTRA_PADDING },
        componentId: 'settings-scroll'
      },
        React.createElement(View, { style: styles.createCard, componentId: 'settings-card' },
          React.createElement(Text, { style: styles.cardTitle, componentId: 'settings-card-title' }, 'Your profile'),
          React.createElement(TextInput, {
            style: styles.input, value: nameState[0], onChangeText: nameState[1],
            placeholder: 'Display name', placeholderTextColor: SECONDARY,
            autoCapitalize: 'words', componentId: 'settings-name-input'
          }),
          React.createElement(TouchableOpacity, { style: styles.primaryButton, onPress: saveProfile, componentId: 'settings-save-button' },
            React.createElement(Text, { style: styles.buttonText, componentId: 'settings-save-text' }, 'Save profile'))),
        React.createElement(View, { style: styles.createCard, componentId: 'settings-about-card' },
          React.createElement(Text, { style: styles.cardTitle, componentId: 'settings-about-title' }, 'About Chit Chat'),
          React.createElement(Text, { style: styles.secondary, componentId: 'settings-about-copy' }, 'Version 1.0.0 · Secure local storage message platform.'))
      ));
  };
  // @end:SettingsScreen

  // @section:navigation @depends:[ChatsScreen,ConversationScreen,CallsScreen,SettingsScreen,ThemeContext]
  var MainTabs = function() {
    return React.createElement(Tab.Navigator, {
      screenOptions: function(props) {
        return {
          headerShown: false,
          tabBarStyle: { backgroundColor: CARD, borderTopColor: BORDER, height: TAB_MENU_HEIGHT },
          tabBarActiveTintColor: PRIMARY,
          tabBarInactiveTintColor: SECONDARY,
          tabBarIcon: function(opts) {
            var name = props.route.name === 'Chats' ? 'chatbubbles' : 'settings';
            return React.createElement(Ionicons, { name: opts.focused ? name : name + '-outline', size: 22, color: opts.color, componentId: 'tab-icon-' + props.route.name });
          }
        };
      },
      componentId: 'main-tabs'
    },
      React.createElement(Tab.Screen, { name: 'Chats', component: ChatsScreen, componentId: 'tab-chats' }),
      React.createElement(Tab.Screen, { name: 'Settings', component: SettingsScreen, componentId: 'tab-settings' })
    );
  };
  var AppNavigator = function() {
    return React.createElement(Stack.Navigator, { screenOptions: { headerShown: false }, componentId: 'app-stack' },
      React.createElement(Stack.Screen, { name: 'Main', component: MainTabs, componentId: 'stack-main' }),
      React.createElement(Stack.Screen, { name: 'Conversation', component: ConversationScreen, componentId: 'stack-conversation' }),
      React.createElement(Stack.Screen, { name: 'Calls', component: CallsScreen, componentId: 'stack-calls' })
    );
  };
  // @end:navigation

  // @section:main @depends:[ThemeProvider,AppNavigator,styles]
  var RootComponent = function() {
    seedSampleRows(SAMPLE_ROWS);
    return React.createElement(ThemeProvider, null,
      React.createElement(AppNavigator, { componentId: 'root-navigator' }));
  };
  // @end:main

  // @section:styles @depends:[theme]
  var styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: BACKGROUND },
    hero: { backgroundColor: PRIMARY, paddingHorizontal: 20, paddingBottom: 24 },
    heroEyebrow: { color: PALE, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
    heroTitle: { color: CARD, fontSize: 28, fontWeight: '800', marginBottom: 2 },
    heroSubtitle: { color: PALE, fontSize: 14 },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { color: TEXT, fontSize: 18, fontWeight: '700' },
    countLabel: { color: SECONDARY, fontSize: 13, fontWeight: '600' },
    chatRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, padding: 12, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
    avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
    avatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: PALE, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarInitial: { color: PRIMARY, fontSize: 18, fontWeight: '700' },
    rowBody: { flex: 1 },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    rowTitle: { color: TEXT, fontSize: 15, fontWeight: '700' },
    secondary: { color: SECONDARY, fontSize: 13 },
    micro: { color: SECONDARY, fontSize: 11 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    emptyCard: { backgroundColor: CARD, padding: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER, marginBottom: 16 },
    createCard: { backgroundColor: CARD, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 16 },
    cardTitle: { color: TEXT, fontSize: 16, fontWeight: '700', marginBottom: 12 },
    input: { backgroundColor: BACKGROUND, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: TEXT, fontSize: 14, marginBottom: 12 },
    choiceRow: { flexDirection: 'row', marginBottom: 12 },
    choice: { flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderRadius: 8, marginRight: 8, backgroundColor: BACKGROUND },
    choiceActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
    choiceText: { color: SECONDARY, fontSize: 13, fontWeight: '600' },
    choiceTextActive: { color: CARD, fontSize: 13, fontWeight: '600' },
    primaryButton: { backgroundColor: PRIMARY, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    buttonText: { color: CARD, fontSize: 14, fontWeight: '700' },
    outlineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: CARD, borderWidth: 1, borderColor: PRIMARY, paddingVertical: 12, borderRadius: 12, marginBottom: 16 },
    outlineButtonText: { color: PRIMARY, fontSize: 14, fontWeight: '700', marginLeft: 6 },
    notice: { color: SECONDARY, fontSize: 12, textAlign: 'center', marginBottom: 20 },
    chatHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 12 },
    iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
    headerName: { flex: 1, marginHorizontal: 8 },
    headerTitle: { color: CARD, fontSize: 16, fontWeight: '700' },
    headerMeta: { color: PALE, fontSize: 11 },
    messageWrap: { marginBottom: 12, maxWidth: '80%' },
    messageIn: { alignSelf: 'flex-start' },
    messageOut: { alignSelf: 'flex-end' },
    senderName: { color: SECONDARY, fontSize: 11, fontWeight: '600', marginBottom: 2, marginLeft: 4 },
    bubble: { padding: 12, borderRadius: 16, borderWidth: 1 },
    bubbleIn: { backgroundColor: CARD, borderColor: BORDER },
    bubbleOut: { backgroundColor: PALE, borderColor: BORDER },
    body: { color: TEXT, fontSize: 14 },
    messagePhoto: { width: 200, height: 150, borderRadius: 10 },
    messageMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, marginRight: 4 },
    photoPreview: { backgroundColor: CARD, padding: 12, borderTopWidth: 1, borderColor: BORDER, alignItems: 'center' },
    previewImage: { width: 100, height: 100, borderRadius: 8, marginBottom: 8 },
    smallAction: { backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    smallActionText: { color: CARD, fontSize: 12, fontWeight: '600' },
    errorText: { color: '#D9534F', fontSize: 12, textAlign: 'center', margin: 4 },
    composer: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: BORDER },
    composerIcon: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
    messageInput: { flex: 1, backgroundColor: BACKGROUND, borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 90, color: TEXT, fontSize: 14, marginHorizontal: 4 },
    sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
    callHero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    callTitle: { color: CARD, fontSize: 22, fontWeight: '700', marginTop: 16, marginBottom: 8 },
    callStatus: { color: PALE, fontSize: 14 },
    callActions: { alignItems: 'center', paddingBottom: 20 },
    callButtonDanger: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#D9534F', justifyContent: 'center', alignItems: 'center' }
  });
  // @end:styles

  return React.createElement(RootComponent, null);
};
