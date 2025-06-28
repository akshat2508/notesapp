
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Modal,
  Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from './store';
import { loginUser, registerUser, clearAuthError } from './store';
import { AuthMode } from './types';
import { LinearGradient } from 'expo-linear-gradient'; 
import { Ionicons } from '@expo/vector-icons'; 

const { width, height } = Dimensions.get('window');

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type: 'error' | 'info' | 'success';
  onClose: () => void;
}

const CustomAlert: React.FC<CustomAlertProps> = ({ visible, title, message, type, onClose }) => {
  const [slideAnim] = useState(new Animated.Value(-100));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      const timer = setTimeout(() => {
        onClose();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const getAlertColor = () => {
    switch (type) {
      case 'error': return '#FF4444';
      case 'success': return '#00C851';
      case 'info': return '#33B5E5';
      default: return '#FF4444';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error': return 'close-circle';
      case 'success': return 'checkmark-circle';
      case 'info': return 'information-circle';
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
            { 
              backgroundColor: getAlertColor(),
              transform: [{ translateY: slideAnim }] 
            }
          ]}
        >
          <Ionicons name={getIcon()} size={24} color="#fff" />
          <View style={styles.alertTextContainer}>
            <Text style={styles.alertTitle}>{title}</Text>
            <Text style={styles.alertMessage}>{message}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.alertCloseButton}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'error' | 'info' | 'success';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'error'
  });
  
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);


  React.useEffect(() => {
    if (error && error.trim() !== '') {
      console.log('Redux error detected:', error);
      showAlert('Authentication Failed', error, 'error');

      dispatch(clearAuthError());
    }
  }, [error, dispatch]);

  const showAlert = (title: string, message: string, type: 'error' | 'info' | 'success' = 'error') => {
    setAlert({ visible: true, title, message, type });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, visible: false }));
  };

  const handleSubmit = async () => {
    console.log('Handle submit called');
    
    if (!email.trim() || !password.trim()) {
      showAlert('Missing Information', 'Please fill in all fields to continue', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showAlert('Invalid Email', 'Please enter a valid email address', 'error');
      return;
    }

    if (password.length < 6) {
      showAlert('Weak Password', 'Password must be at least 6 characters long', 'error');
      return;
    }


    dispatch(clearAuthError());

    try {
      console.log('Attempting authentication...');
      let result;
      
      if (mode === 'login') {
        result = await dispatch(loginUser({ email: email.trim(), password }));
        console.log('Login result:', result);
      } else {
        result = await dispatch(registerUser({ email: email.trim(), password }));
        console.log('Register result:', result);
      }


      if (result.type.endsWith('/rejected')) {
        console.log('Action was rejected:', result);
        const errorMessage = 'Invalid credentials. Please check your email and password.';
        showAlert('Authentication Failed', errorMessage, 'error');
        return;
      }


      if (result.type.endsWith('/fulfilled')) {
        console.log('Action was fulfilled:', result);
        const successMessage = mode === 'login' ? 'Welcome Back!' : 'Account Created!';
        const successDescription = mode === 'login' 
          ? 'You have successfully logged in' 
          : 'Your account has been created successfully';
        showAlert(successMessage, successDescription, 'success');
        return;
      }


      console.log('Unexpected result type:', result);
      showAlert('Authentication Failed', 'Please check your credentials and try again', 'error');

    } catch (error: any) {
      console.log('Catch block error:', error);
      const errorMessage = error.message || 
                          error.toString() || 
                          'Network error. Please check your connection and try again.';
      showAlert('Authentication Failed', errorMessage, 'error');
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    dispatch(clearAuthError());
    setEmail('');
    setPassword('');
  };

  const continueOffline = () => {
    showAlert(
      'Offline Mode', 
      'You need to login first to save notes offline, which can then be synced to the cloud later.', 
      'info'
    );
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.appTitle}>SecureNotes</Text>
          <Text style={styles.subtitle}>Your thoughts, safely stored</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'login' && styles.activeModeButton]}
              onPress={() => mode !== 'login' && toggleMode()}
            >
              <Text style={[styles.modeButtonText, mode === 'login' && styles.activeModeButtonText]}>
                Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'signup' && styles.activeModeButton]}
              onPress={() => mode !== 'signup' && toggleMode()}
            >
              <Text style={[styles.modeButtonText, mode === 'signup' && styles.activeModeButtonText]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#667eea" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#667eea" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Enter your password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-outline" : "eye-off-outline"} 
                size={20} 
                color="#667eea" 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <LinearGradient
              colors={isLoading ? ['#ccc', '#999'] : ['#667eea', '#764ba2']}
              style={styles.submitButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    {mode === 'login' ? 'Login' : 'Create Account'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.offlineButton}
            onPress={continueOffline}
            disabled={isLoading}
          >
            <Ionicons name="cloud-offline-outline" size={20} color="#667eea" />
            <Text style={styles.offlineButtonText}>Continue Offline</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Secure • Private 
          </Text>
        </View>
      </LinearGradient>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={hideAlert}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: height * 0.1,
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    fontWeight: '300',
  },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 4,
    marginBottom: 30,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeModeButton: {
    backgroundColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeModeButtonText: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  passwordInput: {
    paddingRight: 40,
  },
  passwordToggle: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e9ecef',
  },
  dividerText: {
    marginHorizontal: 20,
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  offlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
    gap: 8,
  },
  offlineButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  footerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },

  alertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 50,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  alertTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  alertMessage: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 18,
  },
  alertCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
});



