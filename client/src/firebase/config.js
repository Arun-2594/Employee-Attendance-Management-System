// Alternative Firebase config
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Alternative: Try with explicit configuration
const getFirebaseConfig = () => {
  return {
    apiKey: "AIzaSyCsbizjGPZ9Ls1SaIEMJHpHQkImXHCjjfk",
    authDomain: "emp-attendance-mgmt-system.firebaseapp.com",
    projectId: "emp-attendance-mgmt-system",
    storageBucket: "emp-attendance-mgmt-system.firebasestorage.app",
    messagingSenderId: "520689181645",
    appId: "1:520689181645:web:c8409d219fa19890be9a84",
    measurementId: "G-3KT3EB1QNY"
  };
};

let app;
let auth;

try {
  const config = getFirebaseConfig();
  console.log('Firebase config:', config);
  app = initializeApp(config, 'employee-attendance-app');
  auth = getAuth(app);
  console.log('Firebase initialized successfully with custom name');
} catch (error) {
  console.error('Firebase initialization failed:', error);
  
  // Last resort: try without app name
  try {
    const config = getFirebaseConfig();
    app = initializeApp(config);
    auth = getAuth(app);
    console.log('Firebase initialized without custom name');
  } catch (finalError) {
    console.error('Final Firebase initialization failed:', finalError);
  }
}

export { auth };
export default app;