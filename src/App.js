// src/App.js
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, enableIndexedDbPersistence } from 'firebase/firestore';
import { 
    Button, TextField, Box, Typography, Container, createTheme, ThemeProvider, CssBaseline, ButtonGroup, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import StudentDashboard from './StudentDashboard';
import TeacherDashboard from './TeacherDashboard';
import ParentDashboard from './ParentDashboard';

const firebaseConfig = {
    apiKey: "AIzaSyAH1W5OjdrNYk50aex1y7WyuWsNzeCvBj4",
    authDomain: "edunabha-app.firebaseapp.com",
    projectId: "edunabha-app",
    storageBucket: "edunabha-app.appspot.com",
    messagingSenderId: "505805633599",
    appId: "1:505805633599:web:b1ffed4b31851b5594208a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

enableIndexedDbPersistence(db).catch((err) => { 
    console.log("Offline persistence error: ", err.code); 
});

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#4caf50' },
    },
});

const ClassPickerModal = ({ open, onSave, userId }) => {
    const [selectedClass, setSelectedClass] = useState('');
    const handleSave = () => { if (selectedClass) { onSave(userId, selectedClass); } };
    return (
        <Dialog open={open} onClose={() => {}} fullWidth maxWidth="xs">
            <DialogTitle>Welcome! Please select your class</DialogTitle>
            <DialogContent>
                <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel id="class-select-label">Class</InputLabel>
                    <Select
                        labelId="class-select-label"
                        value={selectedClass}
                        label="Class"
                        onChange={(e) => setSelectedClass(e.target.value)}
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(classNum => (
                            <MenuItem key={classNum} value={`Class ${classNum}`}>Class {classNum}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleSave} variant="contained" disabled={!selectedClass}>Save and Continue</Button>
            </DialogActions>
        </Dialog>
    );
};

const LoginScreen = ({ handleLogin, handleSignUp, email, setEmail, password, setPassword, error, isLoading, isSignUp, setIsSignUp, activeRole, setActiveRole }) => (
    <Container component="main" maxWidth="xs">
        <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography component="h1" variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>{isSignUp ? 'Sign Up' : 'Login'}</Typography>
            
            {!isSignUp && (
                <ButtonGroup variant="outlined" fullWidth sx={{ mb: 2 }}>
                    <Button variant={activeRole === 'Student' ? 'contained' : 'outlined'} onClick={() => setActiveRole('Student')}>Student</Button>
                    <Button variant={activeRole === 'Teacher' ? 'contained' : 'outlined'} onClick={() => setActiveRole('Teacher')}>Teacher</Button>
                    <Button variant={activeRole === 'Parent' ? 'contained' : 'outlined'} onClick={() => setActiveRole('Parent')}>Parent</Button>
                </ButtonGroup>
            )}

            <Box component="form" onSubmit={isSignUp ? handleSignUp : handleLogin} sx={{ mt: 1, width: '100%' }}>
                {isSignUp && (
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="role-select-label">I am a...</InputLabel>
                        <Select
                            labelId="role-select-label"
                            value={activeRole}
                            label="I am a..."
                            onChange={(e) => setActiveRole(e.target.value)}
                        >
                            <MenuItem value={'Student'}>Student</MenuItem>
                            <MenuItem value={'Teacher'}>Teacher</MenuItem>
                            <MenuItem value={'Parent'}>Parent</MenuItem>
                        </Select>
                    </FormControl>
                )}

                <TextField margin="normal" required fullWidth id="email" label="Email Address" name="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
                <TextField margin="normal" required fullWidth name="password" label="Password" type="password" id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                {error && <Typography color="error" align="center" sx={{ mt: 2 }}>{error}</Typography>}
                <Button type="submit" fullWidth variant="contained" disabled={isLoading} sx={{ mt: 3, mb: 2, py: 1.5, fontWeight: 'bold' }}>{isLoading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Login')}</Button>
                <Typography align="center">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}
                    <Button onClick={() => setIsSignUp(!isSignUp)} sx={{ textTransform: 'none', ml: 1 }}>{isSignUp ? 'Login' : 'Sign Up'}</Button>
                </Typography>
            </Box>
        </Box>
    </Container>
);

function App() {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [activeRole, setActiveRole] = useState('Student');
    const [showClassPicker, setShowClassPicker] = useState(false);
    const [newUserForClassPicker, setNewUserForClassPicker] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setUser(currentUser);
                    setUserRole(userDoc.data().role);
                } else {
                    await signOut(auth);
                }
            } else {
                setUser(null);
                setUserRole(null);
            }
            setIsAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async (e) => { 
        e.preventDefault(); 
        setError(''); 
        setIsLoading(true); 
        try { 
            await signInWithEmailAndPassword(auth, email, password); 
        } catch (err) { 
            setError('Invalid email or password.'); 
        } finally { 
            setIsLoading(false); 
        } 
    };
    
    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;
            
            const roleToSet = activeRole.toLowerCase();

            await setDoc(doc(db, "users", newUser.uid), {
                email: newUser.email,
                role: roleToSet
            });
            
            if (roleToSet === 'student') {
                setNewUserForClassPicker(newUser.uid);
                setShowClassPicker(true);
            } else {
                alert(`Success! Your ${activeRole} account has been created. Please log in now.`);
            }
            
            setIsSignUp(false);
            setEmail('');
            setPassword('');

        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already in use.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password should be at least 6 characters.');
            } else {
                setError('Failed to create an account.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveClass = async (userId, selectedClass) => {
        if (!userId || !selectedClass) return;
        const userDocRef = doc(db, 'users', userId);
        try {
            await updateDoc(userDocRef, { class: selectedClass });
            alert(`Thank you! Your class has been set to ${selectedClass}. Please log in now.`);
        } catch (error) {
            console.error("Error updating user's class: ", error);
            alert("Sorry, there was an error saving your class.");
        }
        setShowClassPicker(false);
        setNewUserForClassPicker(null);
    };

    const handleLogout = async () => { 
        await signOut(auth); 
    };

    if (isAuthLoading) {
        return ( 
            <ThemeProvider theme={darkTheme}>
                <CssBaseline />
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    <CircularProgress />
                </Box>
            </ThemeProvider> 
        );
    }

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            
            <ClassPickerModal
                open={showClassPicker}
                onSave={handleSaveClass}
                userId={newUserForClassPicker}
            />

            {!user ? (
                <LoginScreen 
                    handleLogin={handleLogin} 
                    handleSignUp={handleSignUp} 
                    email={email} 
                    setEmail={setEmail} 
                    password={password} 
                    setPassword={setPassword} 
                    error={error} 
                    isLoading={isLoading} 
                    isSignUp={isSignUp} 
                    setIsSignUp={setIsSignUp}
                    activeRole={activeRole} 
                    setActiveRole={setActiveRole}
                />
            ) : (
                <>
                    {userRole === 'student' && <StudentDashboard user={user} handleLogout={handleLogout} />}
                    {userRole === 'teacher' && <TeacherDashboard user={user} handleLogout={handleLogout} />}
                    {userRole === 'parent' && <ParentDashboard user={user} handleLogout={handleLogout} />}
                </>
            )}
        </ThemeProvider>
    );
}

export default App;