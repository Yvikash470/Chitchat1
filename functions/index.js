const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
initializeApp();
const db = getFirestore();
exports.notifyNewChatMessage = onDocumentCreated('conversations/{conversationId}/messages/{messageId}', async (event) => {
 const message = event.data?.data(); if (!message?.senderId) return;
 const snap = await db.doc(`conversations/${event.params.conversationId}`).get(); if (!snap.exists) return;
 const data = snap.data() || {}; const recipients = (data.members || []).filter(uid => uid !== message.senderId && !(data.hiddenFor || []).includes(uid));
 const users = await Promise.all(recipients.map(uid => db.doc(`users/${uid}/private/push`).get()));
 const tokens = users.map(u => u.data()?.expoPushToken).filter(t => typeof t === 'string' && t.startsWith('ExponentPushToken[')); if (!tokens.length) return;
 const payloads = tokens.map(to => ({ to, sound:'default', channelId:'messages', title:message.senderName || 'New Chit Chat message', body:message.text || (message.mediaType === 'video' ? 'Sent a video' : message.mediaUrl ? 'Sent a photo' : 'You received a message'), data:{ conversationId:event.params.conversationId } }));
 const response = await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{Accept:'application/json','Accept-encoding':'gzip, deflate','Content-Type':'application/json'},body:JSON.stringify(payloads)});
 if(!response.ok) logger.error('Expo push request failed',{status:response.status,body:await response.text()});
});
