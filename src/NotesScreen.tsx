

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import { RootState, AppDispatch } from './store';
import { 
  addNote, 
  removeNote, 
  loadNotes, 
  syncNotes, 
  setSearchQuery, 
  logoutUser,
  setSyncStatus ,
  clearNotesError
} from './store';
import { Note } from './types';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type: 'error' | 'info' | 'success' | 'warning';
  onClose: () => void;
  showActions?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const CustomAlert: React.FC<CustomAlertProps> = ({ 
  visible, 
  title, 
  message, 
  type, 
  onClose,
  showActions = false,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel'
}) => {
  const [slideAnim] = useState(new Animated.Value(100));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      if (!showActions) {
        const timer = setTimeout(() => {
          onClose();
        }, 3000);
        return () => clearTimeout(timer);
      }
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, showActions]);

  const getAlertColor = () => {
    switch (type) {
      case 'error': return '#FF4444';
      case 'success': return '#00C851';
      case 'info': return '#33B5E5';
      case 'warning': return '#FF8800';
      default: return '#FF4444';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error': return 'close-circle';
      case 'success': return 'checkmark-circle';
      case 'info': return 'information-circle';
      case 'warning': return 'warning';
      default: return 'close-circle';
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.alertOverlay}>
        <Animated.View 
          style={[
            styles.alertContainer, 
            showActions && styles.alertContainerWithActions,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <LinearGradient
            colors={[getAlertColor(), `${getAlertColor()}DD`]}
            style={[styles.alertGradient, showActions && styles.alertGradientWithActions]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.alertHeader}>
              <Ionicons name={getIcon()} size={24} color="#fff" />
              <View style={styles.alertTextContainer}>
                <Text style={styles.alertTitle}>{title}</Text>
                <Text style={styles.alertMessage}>{message}</Text>
              </View>
              {!showActions && (
                <TouchableOpacity onPress={onClose} style={styles.alertCloseButton}>
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
            
            {showActions && (
              <View style={styles.alertActions}>
                <TouchableOpacity
                  style={[styles.alertActionButton, styles.alertCancelButton]}
                  onPress={() => {
                    onCancel?.();
                    onClose();
                  }}
                >
                  <Text style={styles.alertCancelText}>{cancelText}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.alertActionButton, styles.alertConfirmButton]}
                  onPress={() => {
                    onConfirm?.();
                    onClose();
                  }}
                >
                  <Text style={styles.alertConfirmText}>{confirmText}</Text>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

export const NotesScreen: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTags, setNewTags] = useState('');
  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'error' | 'info' | 'success' | 'warning';
    showActions?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'error'
  });

  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { notes, isLoading, searchQuery, syncStatus, error } = useSelector(
    (state: RootState) => state.notes
  );

  useEffect(() => {
    dispatch(loadNotes());
  }, [dispatch]);

  useEffect(() => {
    if (syncStatus === 'success') {
      setTimeout(() => dispatch(setSyncStatus('idle')), 2000);
    }
  }, [syncStatus, dispatch]);

  const showAlert = (
    title: string, 
    message: string, 
    type: 'error' | 'info' | 'success' | 'warning' = 'error',
    showActions = false,
    onConfirm?: () => void,
    onCancel?: () => void,
    confirmText = 'OK',
    cancelText = 'Cancel'
  ) => {
    setAlert({ 
      visible: true, 
      title, 
      message, 
      type, 
      showActions, 
      onConfirm, 
      onCancel, 
      confirmText, 
      cancelText 
    });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, visible: false }));
  };

  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes;
    
    const query = searchQuery.toLowerCase();
    return notes.filter(note => 
      note.title.toLowerCase().includes(query) ||
      note.description?.toLowerCase().includes(query) ||
      note.tags?.toLowerCase().includes(query)
    );
  }, [notes, searchQuery]);

  const offlineNotesCount = notes.filter(note => note.isOffline).length;

  const handleAddNote = async () => {
    if (!newTitle.trim()) {
      showAlert('Missing Information', 'Title is required to create a note', 'warning');
      return;
    }

    try {
      await dispatch(addNote({
        title: newTitle.trim(),
        description: newDescription.trim(),
        tags: newTags.trim(),
      })).unwrap();

      setNewTitle('');
      setNewDescription('');
      setNewTags('');
      setModalVisible(false);
      showAlert('Success', 'Note created successfully!', 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to add note', 'error');
    }
  };

  const handleDeleteNote = (note: Note) => {
    showAlert(
      'Delete Note',
      `Are you sure you want to delete "${note.title}"? This action cannot be undone.`,
      'warning',
      true,
      () => dispatch(removeNote(note.id)),
      undefined,
      'Delete',
      'Cancel'
    );
  };

  const handleSync = async () => {
    if (!user) {
      showAlert('Authentication Required', 'Please log in to sync your notes with the cloud', 'info');
      return;
    }

    try {
      await dispatch(syncNotes()).unwrap(); 
      dispatch(clearNotesError()); 
      showAlert('Sync Complete', 'Your notes have been successfully synced!', 'success');
    } catch (error: any) {
      const message =
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch')
          ? 'You are offline. Please connect to the internet to sync.'
          : error.message || 'Something went wrong while syncing.';

      showAlert('Sync Failed', message, 'error');
    }
  };

  const handleLogout = () => {
    showAlert(
      'Logout',
      'Are you sure you want to logout? Offline notes will remain on this device.',
      'warning',
      true,
      () => dispatch(logoutUser()),
      undefined,
      'Logout',
      'Cancel'
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'syncing': return '#007AFF';
      case 'success': return '#34C759';
      case 'error': return '#FF3B30';
      default: return '#667eea';
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'syncing': return 'Syncing...';
      case 'success': return 'Synced';
      case 'error': return 'Sync failed';
      default: return user ? 'Online' : 'Offline';
    }
  };

  const renderNote = ({ item }: { item: Note }) => (
    <View style={styles.noteCard}>
      <LinearGradient
        colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
        style={styles.noteGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.noteHeader}>
          <Text style={styles.noteTitle}>{item.title}</Text>
          <View style={styles.noteActions}>
            {item.isOffline && (
              <View style={styles.offlineBadge}>
                <Ionicons name="cloud-offline" size={12} color="#fff" />
                <Text style={styles.offlineBadgeText}>Offline</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => handleDeleteNote(item)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        {item.description && (
          <Text style={styles.noteDescription}>{item.description}</Text>
        )}
        
        {item.tags && (
          <View style={styles.tagsContainer}>
            <Ionicons name="pricetag-outline" size={12} color="#667eea" />
            <Text style={styles.noteTags}>{item.tags}</Text>
          </View>
        )}
        
        <View style={styles.noteFooter}>
          <Ionicons name="time-outline" size={12} color="#999" />
          <Text style={styles.noteDate}>
            {formatDate(item.updated_at)}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>My Notes</Text>
            <Text style={styles.headerSubtitle}>
              {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.statusIndicator, { backgroundColor: getSyncStatusColor() }]}>
              <Ionicons 
                name={user ? "cloud-done" : "cloud-offline"} 
                size={12} 
                color="#fff" 
              />
              <Text style={styles.statusText}>{getSyncStatusText()}</Text>
            </View>
            {user && (
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Ionicons name="log-out-outline" size={14} color="#fff" />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search and Controls */}
        <View style={styles.controlsContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color="#667eea" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search notes..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={(text) => dispatch(setSearchQuery(text))}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => dispatch(setSearchQuery(''))}
                style={styles.clearSearch}
              >
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            onPress={handleSync}
            style={[styles.syncButton, syncStatus === 'syncing' && styles.syncButtonDisabled]}
            disabled={syncStatus === 'syncing'}
          >
            <LinearGradient
              colors={syncStatus === 'syncing' ? ['#ccc', '#999'] : ['#667eea', '#764ba2']}
              style={styles.syncButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {syncStatus === 'syncing' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="sync-outline" size={16} color="#fff" />
                  <Text style={styles.syncButtonText}>
                    Sync {offlineNotesCount > 0 && `(${offlineNotesCount})`}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Add Note Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <LinearGradient
            colors={['#34C759', '#30D158']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Note</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Notes List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading notes...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredNotes}
            renderItem={renderNote}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.notesList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={48} color="rgba(255,255,255,0.6)" />
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No notes found' : 'No notes yet'}
                </Text>
                <Text style={styles.emptyText}>
                  {searchQuery 
                    ? 'Try adjusting your search terms' 
                    : 'Create your first note to get started!'
                  }
                </Text>
              </View>
            }
          />
        )}

        {/* Add Note Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <LinearGradient
                colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.95)']}
                style={styles.modalGradient}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add New Note</Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={20} color="#667eea" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalInputContainer}>
                  <Ionicons name="document-text-outline" size={18} color="#667eea" style={styles.modalInputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Title *"
                    placeholderTextColor="#999"
                    value={newTitle}
                    onChangeText={setNewTitle}
                    maxLength={100}
                  />
                </View>

                <View style={[styles.modalInputContainer, styles.modalTextAreaContainer]}>
                  <Ionicons name="text-outline" size={18} color="#667eea" style={[styles.modalInputIcon, styles.modalTextAreaIcon]} />
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    placeholder="Description"
                    placeholderTextColor="#999"
                    value={newDescription}
                    onChangeText={setNewDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.modalInputContainer}>
                  <Ionicons name="pricetag-outline" size={18} color="#667eea" style={styles.modalInputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Tags (comma separated)"
                    placeholderTextColor="#999"
                    value={newTags}
                    onChangeText={setNewTags}
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalSaveButton}
                    onPress={handleAddNote}
                  >
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      style={styles.modalSaveGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.modalSaveText}>Save</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </View>
        </Modal>

        <CustomAlert
          visible={alert.visible}
          title={alert.title}
          message={alert.message}
          type={alert.type}
          onClose={hideAlert}
          showActions={alert.showActions}
          onConfirm={alert.onConfirm}
          onCancel={alert.onCancel}
          confirmText={alert.confirmText}
          cancelText={alert.cancelText}
        />
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontWeight: '300',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,59,48,0.9)',
    gap: 4,
  },
  logoutText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  controlsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 15,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearSearch: {
    padding: 4,
  },
  syncButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
  notesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  noteCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  noteGradient: {
    padding: 16,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  offlineBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  noteTags: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
  },
  noteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    margin: 20,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalGradient: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(102,126,234,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalInputIcon: {
    marginRight: 10,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  modalTextAreaContainer: {
    alignItems: 'flex-start',
  },
  modalTextAreaIcon: {
    marginTop: 14,
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(102,126,234,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalSaveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  alertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 0,
    zIndex: 9999,
    pointerEvents: 'box-none',
  backgroundColor: 'rgba(0,0,0,0.3)', 
  },
  alertContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 15,
    maxWidth: width * 0.92,
    minWidth: width * 0.75,
    backgroundColor: 'transparent',
  },
 alertContainerWithActions: {
  marginBottom: 0, 
},
  alertGradient: {
    minHeight: 70,
  },
  alertGradientWithActions: {
    minHeight: 140,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    paddingVertical: 20,
  },
  alertTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  alertTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  alertMessage: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },
  alertCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
  },
  alertActions: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 14,
  },
  alertActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCancelButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  alertConfirmButton: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  alertCancelText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  alertConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});