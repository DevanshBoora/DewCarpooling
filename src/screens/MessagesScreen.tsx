import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  SafeAreaView,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Define local types for messages
type Message = { id: string; name: string; avatar: string; lastMessage: string; timestamp: string; unreadCount: number };
type ChatMessage = { id: string; message: string; timestamp: string; isOwn: boolean };

const MessagesScreen: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<Message | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [chatVisible, setChatVisible] = useState(false);

  const openChat = (message: Message) => {
    setSelectedChat(message);
    setChatVisible(true);
  };

  const closeChat = () => {
    setChatVisible(false);
    setSelectedChat(null);
    setNewMessage('');
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      // In a real app, this would send the message to the backend
      console.log('Sending message:', newMessage);
      setNewMessage('');
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => (
    <TouchableOpacity style={styles.messageItem} onPress={() => openChat(item)}>
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={styles.senderName}>{item.name}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={2}>
          {item.lastMessage}
        </Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderChatMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.chatMessage, item.isOwn ? styles.ownMessage : styles.otherMessage]}>
      <Text style={[styles.messageText, item.isOwn ? styles.ownMessageText : styles.otherMessageText]}>
        {item.message}
      </Text>
      <Text style={[styles.chatTimestamp, item.isOwn ? styles.ownTimestamp : styles.otherTimestamp]}>
        {item.timestamp}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.screenTitle}>Messages</Text>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="chatbubble-ellipses-outline" size={48} color="#666" />
        <Text style={{ color: '#999', marginTop: 12 }}>Messaging coming soon</Text>
        <Text style={{ color: '#666', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>Real-time messaging will be available in a future update</Text>
      </View>

      <Modal
        visible={chatVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.chatContainer}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={closeChat} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.chatHeaderInfo}>
              <Image source={{ uri: selectedChat?.avatar }} style={styles.chatAvatar} />
              <Text style={styles.chatName}>{selectedChat?.name}</Text>
            </View>
            <TouchableOpacity style={styles.callButton} onPress={() => Alert.alert('Call', `Calling ${selectedChat?.name}...`)}>
              <Ionicons name="call" size={20} color="#3c7d68" />
            </TouchableOpacity>
          </View>

          <View style={[styles.chatMessages, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: '#999' }}>No messages yet</Text>
          </View>

          <View style={styles.messageInputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor="#666"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Ionicons name="send" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 20,
  },
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  messagesList: {
    flex: 1,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
  },
  lastMessage: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
  },
  unreadBadge: {
    backgroundColor: '#3c7d68',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    marginRight: 16,
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  chatName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  callButton: {
    padding: 8,
  },
  chatMessages: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  chatMessage: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageText: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    fontSize: 14,
    lineHeight: 20,
  },
  ownMessageText: {
    backgroundColor: '#3c7d68',
    color: '#ffffff',
  },
  otherMessageText: {
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
  },
  chatTimestamp: {
    fontSize: 10,
    marginTop: 4,
    paddingHorizontal: 8,
  },
  ownTimestamp: {
    color: '#666',
    textAlign: 'right',
  },
  otherTimestamp: {
    color: '#666',
    textAlign: 'left',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#3c7d68',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MessagesScreen;