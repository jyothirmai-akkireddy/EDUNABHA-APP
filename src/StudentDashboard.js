import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Capacitor } from '@capacitor/core';
import { Document, Page, pdfjs } from 'react-pdf';
// CORRECTED: Updated import paths for react-pdf styles
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import { getFirestore, collection, getDocs, doc, query, orderBy, addDoc, serverTimestamp, setDoc, getDoc, where, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Box, Container, Typography, Button, AppBar, Toolbar, Card, CardActionArea, Grid, Stack, Tabs, Tab, Modal, Fab, CircularProgress, Chip, IconButton, Paper, Accordion, AccordionSummary, AccordionDetails 
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatIcon from '@mui/icons-material/Chat';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import VoiceAssistant from './VoiceAssistant';
import Chatbot from './Chatbot';

// This is the new, corrected line
// This is the new, definitive line that will work



// All subcomponents are the same, the main fix is in the imports above

const TextToSpeechPlayer = forwardRef(({ text }, ref) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const handlePlay = useCallback(() => {
        if (window.speechSynthesis.paused && isPaused) {
            window.speechSynthesis.resume();
            setIsPaused(false);
        } else {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onend = () => {
                setIsSpeaking(false);
                setIsPaused(false);
            };
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        }
        setIsSpeaking(true);
    }, [text, isPaused]);

    const handlePause = () => {
        window.speechSynthesis.pause();
        setIsPaused(true);
        setIsSpeaking(false);
    };

    const handleStop = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsPaused(false);
    };

    useImperativeHandle(ref, () => ({
        play: handlePlay,
        stop: handleStop
    }));

    useEffect(() => {
        return () => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    return (
        <Paper elevation={2} sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, mb: 2, maxWidth: '200px' }}>
            <IconButton onClick={handlePlay} disabled={isSpeaking} color="primary"><PlayArrowIcon /></IconButton>
            <IconButton onClick={handlePause} disabled={!isSpeaking || isPaused} color="primary"><PauseIcon /></IconButton>
            <IconButton onClick={handleStop} disabled={!isSpeaking && !isPaused} color="secondary"><StopIcon /></IconButton>
            <Typography variant="caption">Read Aloud</Typography>
        </Paper>
    );
});

function CommunityView() {
    const [announcements, setAnnouncements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const db = getFirestore();
        const announcementsRef = collection(db, 'announcements');
        const q = query(announcementsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const announcementsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate().toLocaleDateString()
            }));
            setAnnouncements(announcementsData);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="md">
            <Typography variant="h5" sx={{ my: 3, fontWeight: 500 }}>Community Updates</Typography>
            <Stack spacing={3}>
                {announcements.length > 0 ? (
                    announcements.map(post => (
                        <Paper key={post.id} elevation={2} sx={{ p: 2.5 }}>
                            <Typography variant="body1" paragraph>{post.text}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                Posted by {post.teacherName} on {post.createdAt}
                            </Typography>
                        </Paper>
                    ))
                ) : (
                    <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 8 }}>
                        No announcements yet. Check back later!
                    </Typography>
                )}
            </Stack>
        </Container>
    );
}

function StudentDashboard({ user, handleLogout }) {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [earnedBadges, setEarnedBadges] = useState([]);
    const [newlyEarnedBadge, setNewlyEarnedBadge] = useState(null);
    const { isListening, transcript, startListening } = useSpeechRecognition();
    const [lessonDetailTab, setLessonDetailTab] = useState(0);
    const [lessonListTab, setLessonListTab] = useState(0);
    const [mainTab, setMainTab] = useState(0);

    const ttsPlayerRef = useRef();
    const quizViewRef = useRef();

    const handleBackToCourses = () => setSelectedCourse(null);

    const handleBackToLessons = () => {
        if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
        setSelectedLesson(null);
    };

    const handleLessonSelect = (lesson) => {
        setLessonDetailTab(0);
        setSelectedLesson(lesson);
    };

    const handleCourseSelect = async (course) => {
        setLessonListTab(0);
        setSelectedCourse(course);
        setIsLoading(true);
        const db = getFirestore();
        const lessonsRef = collection(db, 'courses', course.id, 'lessons');
        const q = query(lessonsRef, orderBy('order'));
        const lessonSnapshot = await getDocs(q);
        setLessons(lessonSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setIsLoading(false);
    };

    const processVoiceCommand = useCallback((command) => {
        console.log("Voice Command Received:", command);

        if (command.includes('logout') || command.includes('sign out')) {
            handleLogout();
            return;
        }
        if (command.includes('stop reading') || command.includes('stop')) {
            ttsPlayerRef.current?.stop();
            return;
        }
        if (command.includes('back')) {
            if (selectedLesson) { handleBackToLessons(); } 
            else if (selectedCourse) { handleBackToCourses(); }
            return;
        }
        if (command.includes('take me to courses') || command.includes('show me the courses') || command.includes('go to courses')) {
            handleBackToCourses();
            return;
        }

        if (selectedLesson) {
            if (command.includes('start quiz') || command.includes('open quiz')) {
                setLessonDetailTab(2);
                return;
            }
            if (command.includes('play video')) {
                setLessonDetailTab(1);
                return;
            }
            if (command.includes('next question')) {
                quizViewRef.current?.goToNextQuestion();
                return;
            }
            if (command.includes('explain') || command.includes('clarify') || command.includes('what is') || command.includes('read the lesson')) {
                setLessonDetailTab(0);
                ttsPlayerRef.current?.play();
                return;
            }
        }

        if (selectedCourse && !selectedLesson) {
            if (command.includes('open textbook')) {
                setLessonListTab(1);
                return;
            }
            if (command.includes('show lessons')) {
                setLessonListTab(0);
                return;
            }
            const lessonMatch = command.match(/(?:show|open) lesson (\d+)/);
            if (lessonMatch && lessonMatch[1]) {
                const lessonNumber = parseInt(lessonMatch[1], 10);
                if (lessonNumber > 0 && lessons.length >= lessonNumber) {
                    handleLessonSelect(lessons[lessonNumber - 1]);
                }
                return;
            }
        }
        
        if (command.startsWith('open') && !selectedCourse) {
            const courseToOpen = courses.find(c => command.includes(c.name.toLowerCase()));
            if (courseToOpen) handleCourseSelect(courseToOpen);
        }
    }, [courses, lessons, selectedCourse, selectedLesson, handleLogout]);

    useEffect(() => {
        if (transcript) {
            processVoiceCommand(transcript);
        }
    }, [transcript, processVoiceCommand]);

    useEffect(() => {
        const db = getFirestore();
        const fetchCourses = async () => {
            const courseSnapshot = await getDocs(collection(db, 'courses'));
            setCourses(courseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchCourses();
        if (user && user.uid) {
            const badgesRef = collection(db, 'users', user.uid, 'earned_badges');
            const unsubscribe = onSnapshot(badgesRef, (snapshot) => {
                setEarnedBadges(snapshot.docs.map(doc => doc.id));
            });
            return () => unsubscribe();
        }
    }, [user]);

    const handleLessonComplete = async (courseId, lessonId) => {
        const db = getFirestore();
        const authUser = getAuth().currentUser;
        if (!authUser) return;
        const lessonCompletionRef = doc(db, 'users', authUser.uid, 'completed_lessons', lessonId);
        await setDoc(lessonCompletionRef, { courseId, completedAt: serverTimestamp() });
        const allLessonsRef = collection(db, 'courses', courseId, 'lessons');
        const allLessonsSnap = await getDocs(allLessonsRef);
        const totalLessonsInCourse = allLessonsSnap.size;
        const completedLessonsRef = collection(db, 'users', authUser.uid, 'completed_lessons');
        const q = query(completedLessonsRef, where('courseId', '==', courseId));
        const completedLessonsSnap = await getDocs(q);
        const completedLessonsCount = completedLessonsSnap.size;
        if (completedLessonsCount >= totalLessonsInCourse) {
            const badgeRef = doc(db, 'users', authUser.uid, 'earned_badges', courseId);
            const badgeDoc = await getDoc(badgeRef);
            if (!badgeDoc.exists()) {
                const courseDoc = await getDoc(doc(db, 'courses', courseId));
                await setDoc(badgeRef, { courseName: courseDoc.data().name, earnedAt: serverTimestamp() });
                setNewlyEarnedBadge(courseDoc.data().name);
            }
        }
        handleBackToLessons();
    };

    const renderContent = () => {
        if (selectedCourse && !selectedLesson) {
            return <LessonListView course={selectedCourse} lessons={lessons} isLoading={isLoading} handleLessonSelect={handleLessonSelect} handleBackToCourses={handleBackToCourses} handleLogout={handleLogout} activeTab={lessonListTab} setActiveTab={setLessonListTab} />;
        }
        if (selectedLesson) {
            return <LessonDetailView course={selectedCourse} lesson={selectedLesson} handleBackToLessons={handleBackToLessons} handleLogout={handleLogout} activeTab={lessonDetailTab} setActiveTab={setLessonDetailTab} onLessonComplete={handleLessonComplete} ttsPlayerRef={ttsPlayerRef} quizViewRef={quizViewRef} />;
        }
        return (
            <>
                <AppHeader title="Student Dashboard" handleLogout={handleLogout} badgeCount={earnedBadges.length} />
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={mainTab} onChange={(e, newValue) => setMainTab(newValue)} centered>
                        <Tab label="My Courses" />
                        <Tab label="Community" />
                    </Tabs>
                </Box>
                {mainTab === 0 && <CourseListView courses={courses} earnedBadges={earnedBadges} handleCourseSelect={handleCourseSelect} />}
                {mainTab === 1 && <CommunityView />}
            </>
        );
    };

    return (
        <Box sx={{ pb: 15 }}>
            <AnimatePresence mode="wait">
                <motion.div key={selectedCourse ? selectedCourse.id : 'main'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {renderContent()}
                </motion.div>
            </AnimatePresence>
            <VoiceAssistant isListening={isListening} startListening={startListening} />
            {isChatOpen && <Chatbot closeChat={() => setIsChatOpen(false)} />}
            <Fab color="primary" sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }} onClick={() => setIsChatOpen(prev => !prev)}>
                <ChatIcon />
            </Fab>
            <AnimatePresence>
                {newlyEarnedBadge && (
                    <Modal open={true} onClose={() => setNewlyEarnedBadge(null)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
                            <Box sx={{ bgcolor: 'background.paper', p: 4, borderRadius: 2, textAlign: 'center', maxWidth: '90vw' }}>
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} transition={{ delay: 0.2, type: 'spring' }}>
                                    <Typography variant="h1">🏆</Typography>
                                </motion.div>
                                <Typography variant="h5" color="primary" sx={{ mt: 2, fontWeight: 'bold' }}>Course Complete!</Typography>
                                <Typography sx={{ my: 2 }}>You've earned the "{newlyEarnedBadge} Master" badge!</Typography>
                                <Button variant="contained" onClick={() => setNewlyEarnedBadge(null)}>Awesome!</Button>
                            </Box>
                        </motion.div>
                    </Modal>
                )}
            </AnimatePresence>
        </Box>
    );
}

// ========================================================================
// SUB-COMPONENTS (Fully Expanded)
// ========================================================================

function AppHeader({ title, handleLogout, onBack, badgeCount }) {
    return (
        <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 2 }}>
            <Toolbar sx={{ alignItems: 'center' }}>
                {onBack && (
                    <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mr: 2 }}>
                        Back
                    </Button>
                )}
                <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                    {title}
                </Typography>
                {typeof badgeCount !== 'undefined' && (
                    <Chip
                        icon={<span role="img" aria-label="trophy">🏆</span>}
                        label={`${badgeCount} Badges`}
                        color="secondary"
                        sx={{ mr: 2 }}
                        size="small"
                    />
                )}
                <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
                    Logout
                </Button>
            </Toolbar>
        </AppBar>
    );
}

function CourseListView({ courses, earnedBadges, handleCourseSelect, handleLogout }) {
    return (
        <Container maxWidth="md">
            <Typography variant="h5" sx={{ my: 3, fontWeight: 500 }}>Your Subjects</Typography>
            <Grid container spacing={2}>
                {courses.map((course) => (
                    <Grid item xs={12} sm={6} key={course.id}>
                        <motion.div whileHover={{ scale: 1.03 }}>
                            <Card sx={{ opacity: earnedBadges.includes(course.id) ? 0.7 : 1 }}>
                                <CardActionArea onClick={() => handleCourseSelect(course)} sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="h4">{course.icon || '📚'}</Typography>
                                    <Box sx={{ flexGrow: 1 }}><Typography variant="h6">{course.name}</Typography></Box>
                                    {earnedBadges.includes(course.id) && <Typography variant="h5">🏆</Typography>}
                                </CardActionArea>
                            </Card>
                        </motion.div>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
}

function TextbookView({ courseId }) {
    const [chapters, setChapters] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTextbook = async () => {
            setIsLoading(true);
            const db = getFirestore();
            const textbookRef = doc(db, 'textbooks', courseId);
            const textbookSnap = await getDoc(textbookRef);

            if (textbookSnap.exists()) {
                setChapters(textbookSnap.data().chapters || []);
            } else {
                setChapters([]);
            }
            setIsLoading(false);
        };
        fetchTextbook();
    }, [courseId]);

    if (isLoading) return <Box sx={{display: 'flex', justifyContent: 'center', p: 4}}><CircularProgress /></Box>;
    if (chapters.length === 0) return (
        <Typography sx={{ p: 3, textAlign: 'center' }}>
            No textbook available for this subject yet.
        </Typography>
    );

    return (
        <Box sx={{ p: 2 }}>
            {chapters.map((chapter, index) => (
                <Accordion key={index}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography fontWeight="bold">{chapter.title}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                            {chapter.content}
                        </Typography>
                    </AccordionDetails>
                </Accordion>
            ))}
        </Box>
    );
}

function LessonListView({ course, lessons, isLoading, handleLessonSelect, handleBackToCourses, handleLogout, activeTab, setActiveTab }) {
    return (
        <Container maxWidth="md">
            <AppHeader title={course.name} handleLogout={handleLogout} onBack={handleBackToCourses} />
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} centered>
                    <Tab label="Lessons" />
                    <Tab label="Textbook" />
                </Tabs>
            </Box>
            {activeTab === 0 && (
                <Box sx={{ pt: 3 }}>
                    {isLoading ? (
                        <CircularProgress />
                    ) : (
                        <Stack spacing={2}>
                            {lessons.map((lesson, index) => (
                                <motion.div key={lesson.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.07 }}>
                                    <Card>
                                        <CardActionArea onClick={() => handleLessonSelect(lesson)} sx={{ p: 2 }}>
                                            <Typography variant="h6" color="primary" gutterBottom>{lesson.title}</Typography>
                                            <Typography variant="body2" color="text.secondary">{lesson.description}</Typography>
                                        </CardActionArea>
                                    </Card>
                                </motion.div>
                            ))}
                        </Stack>
                    )}
                </Box>
            )}
            {activeTab === 1 && <TextbookView courseId={course.id} />}
        </Container>
    );
}

function LessonDetailView({ course, lesson, handleBackToLessons, handleLogout, activeTab, setActiveTab, onLessonComplete, ttsPlayerRef, quizViewRef }) {
    const [playableVideoUrl, setPlayableVideoUrl] = useState('');

    useEffect(() => {
        if (lesson.videoUrl) {
            if (lesson.videoUrl.startsWith('capacitor://')) {
                // If it's a native path from a phone upload, convert it for the WebView.
                setPlayableVideoUrl(Capacitor.convertFileSrc(lesson.videoUrl));
            } else {
                // If it's a regular web path (like '/videos/file.mp4'), use it directly.
                setPlayableVideoUrl(lesson.videoUrl);
            }
        }
    }, [lesson]);

    return (
        <Container maxWidth="md">
            <AppHeader title={lesson.title} handleLogout={handleLogout} onBack={handleBackToLessons} />
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} centered>
                    <Tab label="Lesson" />
                    <Tab label="Video" />
                    <Tab label="Quiz" />
                </Tabs>
            </Box>
            <Box sx={{ p: { xs: 2, sm: 3 }, mt: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                {activeTab === 0 && (
                    <>
                        <TextToSpeechPlayer text={lesson.lessonText || ''} ref={ttsPlayerRef} />
                        <Typography sx={{ lineHeight: 1.7 }}>{lesson.lessonText}</Typography>
                    </>
                )}
                {activeTab === 1 && (
                    <video
                        width="100%"
                        controls
                        src={playableVideoUrl}
                        style={{ aspectRatio: '16/9', borderRadius: '8px', backgroundColor: 'black' }}
                    >
                        Your browser does not support the video tag.
                    </video>
                )}
                {activeTab === 2 && (
                    <QuizView
                        quizData={lesson.quiz}
                        courseId={course.id}
                        lessonId={lesson.id}
                        onQuizComplete={() => onLessonComplete(course.id, lesson.id)}
                        ref={quizViewRef}
                    />
                )}
            </Box>
        </Container>
    );
}

const QuizView = forwardRef(({ quizData, courseId, lessonId, onQuizComplete }, ref) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const question = quizData[currentQuestionIndex];
    const isQuizFinished = currentQuestionIndex >= quizData.length;

    const handleNextQuestion = useCallback(() => {
        if (!isAnswered && !isQuizFinished) return;
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex >= quizData.length) {
            saveQuizResult().then(() => {
                setTimeout(() => { onQuizComplete() }, 1500);
            });
        }
        setIsAnswered(false);
        setSelectedAnswer(null);
        setCurrentQuestionIndex(nextIndex);
    }, [currentQuestionIndex, isAnswered, isQuizFinished, quizData, onQuizComplete]);

    useImperativeHandle(ref, () => ({
        goToNextQuestion: handleNextQuestion
    }));

    const saveQuizResult = useCallback(async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const db = getFirestore();
        try {
            await addDoc(collection(db, 'quiz_attempts'), {
                studentId: user.uid,
                studentEmail: user.email,
                courseId: courseId,
                lessonId: lessonId,
                score: score,
                totalQuestions: quizData.length,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error saving quiz result: ", error);
        }
    }, [courseId, lessonId, score, quizData]);

    const handleAnswerClick = (answer) => {
        if (isAnswered) return;
        setSelectedAnswer(answer);
        setIsAnswered(true);
        if (answer === question.correctAnswer) setScore(s => s + 1);
    };

    if (!quizData || quizData.length === 0) {
        return (
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">No quiz available for this lesson.</Typography>
            </Box>
        );
    }
    
    if (!question) {
        return (
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">Loading quiz...</Typography>
            </Box>
        );
    }

    if (isQuizFinished) {
        return (
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary" sx={{ mb: 2 }}>Quiz Complete!</Typography>
                <Typography variant="h6">Your final score: {score} / {quizData.length}</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h5" sx={{ mb: 3 }}>{question.question}</Typography>
            <Stack spacing={2}>
                {question.options.map((option, index) => {
                    const isCorrect = option === question.correctAnswer;
                    const isSelected = option === selectedAnswer;
                    let buttonColor = 'inherit';
                    if (isAnswered) {
                        if (isCorrect) buttonColor = 'success';
                        else if (isSelected) buttonColor = 'error';
                    }
                    return (
                        <Button
                            key={index}
                            variant="contained"
                            color={buttonColor}
                            onClick={() => handleAnswerClick(option)}
                            disabled={isAnswered}
                            sx={{ justifyContent: 'flex-start', p: 1.5, textTransform: 'none' }}
                        >
                            {option}
                        </Button>
                    );
                })}
            </Stack>
            {isAnswered && (
                <Button fullWidth variant="contained" onClick={handleNextQuestion} sx={{ mt: 4 }}>
                    Next
                </Button>
            )}
        </Box>
    );
});

export default StudentDashboard;