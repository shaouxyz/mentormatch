import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  hybridSendMessage,
  hybridGetMessages,
  hybridCreateOrGetConversation,
  subscribeToMessages,
} from '@/services/hybridMessageService';
import { hybridGetProfile } from '@/services/hybridProfileService';
import { isFirebaseConfigured } from '@/config/firebase.config';
import { Message } from '@/types/types';
import { logger } from '@/utils/logger';
import { ErrorHandler } from '@/utils/errorHandler';
import { sanitizeTextField } from '@/utils/security';

/**
 * Chat Screen Component
 * 
 * Real-time chat between two users
 * Supports sending/receiving messages with Firebase sync
 */
export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { conversationId, participantEmail, participantName } = params as {
    conversationId: string;
    participantEmail: string;
    participantName: string;
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (currentUserEmail) {
      loadMessages();
      
      // Subscribe to real-time updates if Firebase is configured
      if (isFirebaseConfigured()) {
        const unsubscribe = subscribeToMessages(
          conversationId,
          (newMessages) => {
            setMessages(newMessages);
            scrollToBottom();
          },
          (error) => {
            logger.error('Error in real-time message subscription', error);
          }
        );
        
        return () => unsubscribe();
      }
    }
  }, [currentUserEmail, conversationId]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      
      if (!userData) {
        router.replace('/login');
        return;
      }

      const user = JSON.parse(userData);
      setCurrentUserEmail(user.email);
      
      // Try Firebase first using hybridGetProfile
      let profile = null;
      try {
        profile = await hybridGetProfile(user.email);
      } catch (error) {
        logger.warn('Failed to load profile from Firebase, trying local storage', {
          email: user.email,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      // Fallback to local storage if Firebase failed
      if (!profile) {
        const profileData = await AsyncStorage.getItem('profile');
        if (profileData) {
          profile = JSON.parse(profileData);
        }
      }
      
      if (profile) {
        setCurrentUserName(profile.name);
      }
    } catch (error) {
      ErrorHandler.handleError(error, 'Failed to load user data');
    }
  };

  const loadMessages = async () => {
    try {
      const conversationMessages = await hybridGetMessages(conversationId);
      setMessages(conversationMessages);
      scrollToBottom();
    } catch (error) {
      ErrorHandler.handleError(error, 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim()) return;

    const sanitizedText = sanitizeTextField(messageText);
    if (!sanitizedText) {
      Alert.alert('Error', 'Please enter a valid message');
      return;
    }

    setSending(true);

    try {
      // Ensure conversation exists
      await hybridCreateOrGetConversation(
        currentUserEmail,
        currentUserName,
        participantEmail,
        participantName
      );

      // Send message
      const newMessage = await hybridSendMessage(
        conversationId,
        currentUserEmail,
        currentUserName,
        participantEmail,
        participantName,
        sanitizedText
      );

      // Add message to local state if not using real-time sync
      if (!isFirebaseConfigured()) {
        setMessages(prev => [...prev, newMessage]);
      }

      setMessageText('');
      scrollToBottom();
      
      logger.info('Message sent', { conversationId });
    } catch (error) {
      ErrorHandler.handleError(error, 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderEmail === currentUserEmail;
    
    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
            ]}
          >
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{participantName}</Text>
          <Text style={styles.headerSubtitle}>{participantEmail}</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToBottom}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
          accessibilityLabel="Message input"
        />
        <TouchableOpacity
          style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim() || sending}
          accessibilityLabel="Send message"
        >
          <Ionicons
            name="send"
            size={24}
            color={messageText.trim() && !sending ? '#fff' : '#94a3b8'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  messagesList: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ownMessageBubble: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#1e293b',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  ownMessageTime: {
    color: '#e0e7ff',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#94a3b8',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
});
