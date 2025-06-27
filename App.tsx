// App.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import { store, checkAuthStatus, RootState, AppDispatch } from './src/store';
import { AuthScreen } from './src/AuthScreen';
import { NotesScreen } from './src/NotesScreen';
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Possible Unhandled Promise Rejection']);



const AppContent: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await dispatch(checkAuthStatus());
      } catch (error) {
        console.log('Auth check failed:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, [dispatch]);

  if (isInitializing || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }


  return user ? <NotesScreen /> : <AuthScreen />;
};

const App: React.FC = () => {
  return (
   <Provider store={store}>
  <View style={{ flex: 1 }}>
    <AppContent />
    <Toast />
  </View>
</Provider>

  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default App;