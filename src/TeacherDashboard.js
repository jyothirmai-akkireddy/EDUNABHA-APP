// src/TeacherDashboard.js
import React, { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, collection, collectionGroup, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, setDoc, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { 
    Container, Typography, Grid, Card, CardContent, Box, CircularProgress, Button, Stack, Paper, 
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, 
    IconButton, Radio, FormControlLabel, RadioGroup, FormLabel, Divider
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AppHeader from './AppHeader';

const QuizBuilder = ({ quiz, setQuiz }) => {
    const handleAddQuestion = () => {
        const newQuestion = { question: "", options: ["", "", "", ""], correctAnswer: "" };
        setQuiz([...quiz, newQuestion]);
    };
    const handleRemoveQuestion = (qIndex) => {
        const updatedQuiz = quiz.filter((_, index) => index !== qIndex);
        setQuiz(updatedQuiz);
    };
    const handleQuestionChange = (qIndex, value) => {
        const updatedQuiz = [...quiz];
        updatedQuiz[qIndex].question = value;
        setQuiz(updatedQuiz);
    };
    const handleOptionChange = (qIndex, oIndex, value) => {
        const updatedQuiz = [...quiz];
        if (updatedQuiz[qIndex].correctAnswer === updatedQuiz[qIndex].options[oIndex]) {
            updatedQuiz[qIndex].correctAnswer = "";
        }
        updatedQuiz[qIndex].options[oIndex] = value;
        setQuiz(updatedQuiz);
    };
    const handleCorrectAnswerChange = (qIndex, optionText) => {
        const updatedQuiz = [...quiz];
        updatedQuiz[qIndex].correctAnswer = optionText;
        setQuiz(updatedQuiz);
    };
    return (
        <FormControl fullWidth sx={{ mt: 2, p: 2, border: "1px solid grey", borderRadius: 1 }}>
            <FormLabel sx={{ mb: 2 }}>Quiz Builder</FormLabel>
            <Stack spacing={3}>
                {quiz.map((q, qIndex) => (
                    <Paper key={qIndex} elevation={2} sx={{ p: 2 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography variant="h6">Question {qIndex + 1}</Typography>
                            <IconButton onClick={() => handleRemoveQuestion(qIndex)} color="error"><DeleteIcon /></IconButton>
                        </Box>
                        <TextField fullWidth label="Question Text" value={q.question} onChange={e => handleQuestionChange(qIndex, e.target.value)} sx={{ mt: 1, mb: 2 }} />
                        <RadioGroup value={q.correctAnswer} onChange={e => handleCorrectAnswerChange(qIndex, e.target.value)}>
                            {q.options.map((opt, oIndex) => (
                                <Box key={oIndex} sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                                    <FormControlLabel value={opt} control={<Radio />} label="" />
                                    <TextField fullWidth size="small" label={`Option ${oIndex + 1}`} value={opt} onChange={l => handleOptionChange(qIndex, oIndex, l.target.value)} />
                                </Box>
                            ))}
                        </RadioGroup>
                    </Paper>
                ))}
                <Button onClick={handleAddQuestion} variant="outlined">Add Question</Button>
            </Stack>
        </FormControl>
    );
};

const initialLessonState = { courseId: '', title: '', description: '', videoUrl: '', quiz: [], lessonText: '', order: 10 };
const initialCourseState = { name: '', description: '', icon: '📚', pdfUrl: '' };

function TeacherDashboard({ user, handleLogout }) {
    const [myLessons, setMyLessons] = useState([]);
    const [courses, setCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [classStats, setClassStats] = useState({ studentCount: 0, averageScore: 0 });
    const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
    const [lessonFormState, setLessonFormState] = useState(initialLessonState);
    const [editingLesson, setEditingLesson] = useState(null);
    const [isCourseFormOpen, setIsCourseFormOpen] = useState(false);
    const [newCourse, setNewCourse] = useState(initialCourseState);
    const [announcements, setAnnouncements] = useState([]);
    const [newAnnouncement, setNewAnnouncement] = useState("");
    const [uploading, setUploading] = useState(false);

    const handleVideoSelect = async (event) => {
        if (!event.target.files || event.target.files.length === 0) {
            return;
        }
        const file = event.target.files[0];
        setUploading(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Data = reader.result;
                const fileName = `${Date.now()}-${file.name}`;
                const savedFile = await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Data,
                });
                handleLessonInputChange({ target: { name: 'videoUrl', value: savedFile.uri } });
                setUploading(false);
                alert('Video selected successfully!');
            };
        } catch (error) {
            console.error('File selection failed:', error);
            alert('File selection failed. Please try again.');
            setUploading(false);
        }
    };

    const handlePdfUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setUploading(true);
        const storage = getStorage();
        const storageRef = ref(storage, `textbooks/${Date.now()}-${file.name}`);
        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            setNewCourse(prev => ({ ...prev, pdfUrl: downloadURL }));
            alert("PDF uploaded successfully!");
        } catch (error) {
            console.error("Error uploading PDF: ", error);
            alert("PDF upload failed.");
        } finally {
            setUploading(false);
        }
    };
    
    const fetchAllData = async () => {
        if (!user) return;
        setIsLoading(true);
        const db = getFirestore();
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        setCourses(coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        const lessonsRef = collectionGroup(db, 'lessons');
        const qLessons = query(lessonsRef, where('teacherId', '==', user.uid));
        const lessonsSnapshot = await getDocs(qLessons);
        setMyLessons(lessonsSnapshot.docs.map(doc => ({ id: doc.id, courseId: doc.ref.parent.parent.id, ...doc.data() })));
        const teacherDocRef = doc(db, 'users', user.uid);
        const teacherDoc = await getDoc(teacherDocRef);
        if (teacherDoc.exists() && teacherDoc.data().students && teacherDoc.data().students.length > 0) {
            const studentUids = teacherDoc.data().students;
            const attemptsRef = collection(db, 'quiz_attempts');
            const qAttempts = query(attemptsRef, where('studentId', 'in', studentUids));
            const attemptsSnapshot = await getDocs(qAttempts);
            let totalScore = 0; let totalQuestions = 0;
            attemptsSnapshot.forEach(doc => { totalScore += doc.data().score; totalQuestions += doc.data().totalQuestions; });
            const averageScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
            setClassStats({ studentCount: studentUids.length, averageScore });
        }
        const announcementsRef = collection(db, 'announcements');
        const qAnnouncements = query(announcementsRef, where('teacherId', '==', user.uid), orderBy('createdAt', 'desc'));
        const announcementsSnapshot = await getDocs(qAnnouncements);
        setAnnouncements(announcementsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
        setIsLoading(false);
    };

    useEffect(() => { fetchAllData(); }, [user]);

    const handlePostAnnouncement = async () => {
        if (!newAnnouncement.trim()) return;
        const db = getFirestore();
        try {
            const docRef = await addDoc(collection(db, 'announcements'), { text: newAnnouncement, teacherId: user.uid, teacherName: user.email, createdAt: serverTimestamp() });
            setAnnouncements(prev => [{id: docRef.id, text: newAnnouncement, teacherName: user.email}, ...prev]);
            setNewAnnouncement("");
        } catch(error) {
            console.error("Error posting announcement: ", error);
            alert("Failed to post announcement.");
        }
    };

    const handleOpenLessonForm = (lesson = null) => {
        if (lesson) {
            setEditingLesson(lesson);
            setLessonFormState(lesson);
        } else {
            setEditingLesson(null);
            setLessonFormState(initialLessonState);
        }
        setIsLessonFormOpen(true);
    };

    const handleCloseLessonForm = () => setIsLessonFormOpen(false);
    const handleLessonInputChange = (e) => { const { name, value } = e.target; setLessonFormState(prev => ({ ...prev, [name]: value })); };
    const handleQuizChange = (quizArray) => { setLessonFormState(prev => ({ ...prev, quiz: quizArray })); };

    const handleSaveLesson = async () => {
        if (!lessonFormState.courseId || !lessonFormState.title) { return alert("Please select a course and enter a title."); }
        const db = getFirestore();
        try {
            if (editingLesson) {
                const lessonDocRef = doc(db, "courses", lessonFormState.courseId, "lessons", editingLesson.id);
                await setDoc(lessonDocRef, { ...lessonFormState, updatedAt: serverTimestamp() }, { merge: true });
                setMyLessons(prev => prev.map(l => l.id === editingLesson.id ? lessonFormState : l));
            } else {
                const lessonCollectionRef = collection(db, "courses", lessonFormState.courseId, "lessons");
                const newDocData = { ...lessonFormState, teacherId: user.uid, createdAt: serverTimestamp() };
                const docRef = await addDoc(lessonCollectionRef, newDocData);
                setMyLessons(prev => [...prev, { id: docRef.id, ...newDocData }]);
            }
        } catch (error) {
            console.error("Error saving document: ", error);
            alert("Failed to save lesson.");
        }
        handleCloseLessonForm();
    };

    const handleDeleteLesson = async (courseId, lessonId) => {
        if (!window.confirm("Are you sure?")) return;
        const db = getFirestore();
        try {
            await deleteDoc(doc(db, "courses", courseId, "lessons", lessonId));
            setMyLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
        } catch (error) {
            console.error("Error deleting lesson: ", error);
            alert("Failed to delete lesson.");
        }
    };

    const handleOpenCourseForm = () => { setNewCourse(initialCourseState); setIsCourseFormOpen(true); };
    const handleCloseCourseForm = () => setIsCourseFormOpen(false);
    const handleCourseInputChange = (e) => { const { name, value } = e.target; setNewCourse(prev => ({ ...prev, [name]: value })); };

    const handleSaveCourse = async () => {
        if (!newCourse.name) return alert("Please enter a course name.");
        const db = getFirestore();
        try {
            const courseRef = await addDoc(collection(db, "courses"), { name: newCourse.name, description: newCourse.description, icon: newCourse.icon, teacherId: user.uid, createdAt: serverTimestamp() });
            if (newCourse.pdfUrl) {
                const textbookRef = doc(db, "textbooks", courseRef.id);
                await setDoc(textbookRef, { pdfUrl: newCourse.pdfUrl, courseName: newCourse.name });
            }
            await fetchAllData();
        } catch (error) {
            console.error("Error saving course: ", error);
            alert("Failed to save course.");
        }
        handleCloseCourseForm();
    };
    
    if (isLoading) { return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>; }

    return (
        <>
            <Container maxWidth="md" sx={{ pb: 4 }}>
                <AppHeader title="Teacher Dashboard" handleLogout={handleLogout} />
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6}><Card><CardContent><Typography color="text.secondary" gutterBottom>Total Students</Typography><Typography variant="h4">{classStats.studentCount}</Typography></CardContent></Card></Grid>
                    <Grid item xs={12} sm={6}><Card><CardContent><Typography color="text.secondary" gutterBottom>Class Average Score</Typography><Typography variant="h4">{classStats.averageScore}%</Typography></CardContent></Card></Grid>
                </Grid>

                <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" component="h2" sx={{ fontWeight: 500, mb: 2 }}>Post an Update</Typography>
                    <Paper sx={{ p: 2 }}><TextField fullWidth multiline rows={3} label="Write an announcement..." value={newAnnouncement} onChange={(e) => setNewAnnouncement(e.target.value)} /><Button variant="contained" sx={{ mt: 2 }} onClick={handlePostAnnouncement}>Post Update</Button></Paper>
                </Box>
                <Divider sx={{ my: 4 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" component="h2" sx={{ fontWeight: 500 }}>My Content</Typography>
                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" startIcon={<AddCircleOutlineIcon />} onClick={handleOpenCourseForm}>Create Course</Button>
                        <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={() => handleOpenLessonForm()}>Create Lesson</Button>
                    </Stack>
                </Box>
                
                {myLessons.length > 0 ? (
                    <Stack spacing={2}>{myLessons.map(lesson => ( <Paper key={lesson.id} elevation={2} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Box><Typography variant="h6" color="primary">{lesson.title}</Typography><Typography variant="body2" color="text.secondary">{lesson.description}</Typography></Box><Box><IconButton onClick={() => handleOpenLessonForm(lesson)} color="primary"><EditIcon /></IconButton><IconButton onClick={() => handleDeleteLesson(lesson.courseId, lesson.id)} color="error"><DeleteIcon /></IconButton></Box></Paper> ))}</Stack>
                ) : ( <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 5 }}>You haven't created any lessons yet.</Typography> )}
            </Container>

            <Dialog open={isLessonFormOpen} onClose={handleCloseLessonForm} fullWidth maxWidth="md">
                <DialogTitle>{editingLesson ? "Edit Lesson" : "Create a New Lesson"}</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <FormControl fullWidth><InputLabel>Course</InputLabel><Select name="courseId" value={lessonFormState.courseId} label="Course" onChange={handleLessonInputChange}>{courses.map(course => <MenuItem key={course.id} value={course.id}>{course.name}</MenuItem>)}</Select></FormControl>
                        <TextField name="title" label="Lesson Title" value={lessonFormState.title} onChange={handleLessonInputChange} />
                        <TextField name="description" label="Short Description" value={lessonFormState.description} onChange={handleLessonInputChange} />
                        <TextField name="lessonText" label="Main Lesson Text" multiline rows={4} value={lessonFormState.lessonText} onChange={handleLessonInputChange} />
                        
                        <Box>
                            <Button variant="outlined" component="label" disabled={uploading}>
                                {uploading ? 'Uploading...' : 'Select Video from Phone'}
                                <input type="file" accept="video/*" hidden onChange={handleVideoSelect} />
                            </Button>
                            {lessonFormState.videoUrl && (
                                <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                                    Video selected.
                                </Typography>
                            )}
                        </Box>

                        <QuizBuilder quiz={lessonFormState.quiz} setQuiz={handleQuizChange} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseLessonForm}>Cancel</Button>
                    <Button onClick={handleSaveLesson} variant="contained">Save Lesson</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={isCourseFormOpen} onClose={handleCloseCourseForm} fullWidth maxWidth="sm">
                <DialogTitle>Create a New Course</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <TextField name="name" label="Course Name" value={newCourse.name} onChange={handleCourseInputChange} />
                        <TextField name="description" label="Course Description" value={newCourse.description} onChange={handleCourseInputChange} />
                        <TextField name="icon" label="Course Icon (Emoji)" value={newCourse.icon} onChange={handleCourseInputChange} />
                        <Button variant="outlined" component="label" disabled={uploading}>
                            {uploading ? 'Uploading...' : 'Upload Textbook PDF'}
                            <input type="file" accept=".pdf" hidden onChange={handlePdfUpload} />
                        </Button>
                        {newCourse.pdfUrl && <Typography variant="caption" color="success.main">PDF selected.</Typography>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCourseForm}>Cancel</Button>
                    <Button onClick={handleSaveCourse} variant="contained">Save Course</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
export default TeacherDashboard;