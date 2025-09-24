// src/ParentDashboard.js

import React, { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Container, Typography, Card, CardContent, Box, CircularProgress, Paper, Grid } from '@mui/material';
import AppHeader from './AppHeader';

function ParentDashboard({ user, handleLogout }) {
    const [childProgress, setChildProgress] = useState([]);
    const [overallAverage, setOverallAverage] = useState(0);
    const [childName, setChildName] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchChildProgress = async () => {
            if (!user) return;
            const db = getFirestore();

            // 1. Get the parent's document to find their child's UID
            const parentDocRef = doc(db, 'users', user.uid);
            const parentDoc = await getDoc(parentDocRef);
            if (!parentDoc.exists() || !parentDoc.data().childUids || parentDoc.data().childUids.length === 0) {
                setIsLoading(false);
                return;
            }
            const childUid = parentDoc.data().childUids[0]; // Assuming one child for now

            // Get the child's name
            const childDocRef = doc(db, 'users', childUid);
            const childDoc = await getDoc(childDocRef);
            if (childDoc.exists()) {
                setChildName(childDoc.data().email); // Using email as name for now
            }

            // 2. Get all course names for mapping
            const coursesSnapshot = await getDocs(collection(db, 'courses'));
            const courses = {};
            coursesSnapshot.forEach(doc => {
                courses[doc.id] = doc.data().name;
            });

            // 3. Query all quiz attempts for that child
            const attemptsRef = collection(db, 'quiz_attempts');
            const q = query(attemptsRef, where('studentId', '==', childUid));
            const attemptsSnapshot = await getDocs(q);

            if (attemptsSnapshot.empty) {
                setIsLoading(false);
                return;
            }

            // 4. Process the data
            const progressByCourse = {};
            let grandTotalScore = 0;
            let grandTotalQuestions = 0;

            attemptsSnapshot.forEach(doc => {
                const attempt = doc.data();
                grandTotalScore += attempt.score;
                grandTotalQuestions += attempt.totalQuestions;

                if (!progressByCourse[attempt.courseId]) {
                    progressByCourse[attempt.courseId] = { totalScore: 0, totalQuestions: 0 };
                }
                progressByCourse[attempt.courseId].totalScore += attempt.score;
                progressByCourse[attempt.courseId].totalQuestions += attempt.totalQuestions;
            });

            const formattedProgress = Object.keys(progressByCourse).map(courseId => {
                const data = progressByCourse[courseId];
                const average = Math.round((data.totalScore / data.totalQuestions) * 100);
                return { subject: courses[courseId] || 'Unknown Subject', score: average };
            });

            setChildProgress(formattedProgress);
            setOverallAverage(Math.round((grandTotalScore / grandTotalQuestions) * 100));
            setIsLoading(false);
        };

        fetchChildProgress();
    }, [user]);

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="md">
            <AppHeader title="Parent Dashboard" handleLogout={handleLogout} />
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                Overall Progress for {childName}
                            </Typography>
                            <Typography variant="h3" color="primary">
                                {overallAverage}%
                            </Typography>
                            <Typography color="text.secondary">
                                Average score across all subjects
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Score by Subject</Typography>
                            {childProgress.length > 0 ? (
                                <Paper variant="outlined" sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: 250, p: 2 }}>
                                    {childProgress.map(item => (
                                        <Box key={item.subject} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20%', height: '100%' }}>
                                            <Box sx={{ width: '50%', bgcolor: 'primary.main', borderRadius: '4px 4px 0 0', height: `${item.score}%`, transition: 'height 0.5s ease-in-out', mt: 'auto' }} />
                                            <Typography variant="caption" sx={{ mt: 1, fontWeight: 'bold' }}>{item.subject}</Typography>
                                            <Typography variant="body2">{item.score}%</Typography>
                                        </Box>
                                    ))}
                                </Paper>
                            ) : (
                                <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 8 }}>
                                    No quiz data found for your child yet.
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
}

export default ParentDashboard;