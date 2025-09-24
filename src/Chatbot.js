// // src/Chatbot.js

// import React, { useState } from 'react';
// import { GoogleGenerativeAI } from '@google/generative-ai';

// // Initialize the AI model
// const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
// const genAI = new GoogleGenerativeAI(API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// // A helper function to create a short delay
// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// function Chatbot({ closeChat }) {
//   const [messages, setMessages] = useState([
//     { author: 'ai', text: 'Hello! How can I help you with your studies today?' }
//   ]);
//   const [input, setInput] = useState('');
//   const [isLoading, setIsLoading] = useState(false);

//   const sendMessage = async (e) => {
//     e.preventDefault();
//     if (!input.trim() || isLoading) return;

//     const userMessage = { author: 'user', text: input };
//     setMessages(prev => [...prev, userMessage]);
//     setInput('');
//     setIsLoading(true);

//     // ====================================================================
//     // NEW: Automatic Retry Logic
//     // We will try to send the message up to 3 times if the model is busy.
//     // ====================================================================
//     let success = false;
//     for (let i = 0; i < 3; i++) {
//       try {
//         const result = await model.generateContent(input);
//         const response = await result.response;
//         const text = response.text();
//         const aiMessage = { author: 'ai', text };
//         setMessages(prev => [...prev, aiMessage]);
//         success = true; // Mark as successful
//         break; // Exit the loop if successful
//       } catch (error) {
//         console.error(`Attempt ${i + 1} failed:`, error);
//         // If it's the last attempt, show an error message
//         if (i === 2) {
//           const errorMessage = { author: 'ai', text: 'Sorry, the model is very busy right now. Please try again in a few minutes.' };
//           setMessages(prev => [...prev, errorMessage]);
//         } else {
//           // Wait for 2 seconds before the next attempt
//           await delay(2000);
//         }
//       }
//     }
//     // ====================================================================

//     setIsLoading(false);
//   };

//   return (
//     <div className="fixed bottom-20 right-4 w-96 h-[500px] bg-gray-800 border border-gray-700 rounded-lg shadow-xl flex flex-col z-50">
//       <div className="flex justify-between items-center p-3 border-b border-gray-700">
//         <h3 className="font-bold text-lg text-green-400">Edunabha Assistant</h3>
//         <button onClick={closeChat} className="text-gray-400 hover:text-white">&times;</button>
//       </div>
      
//       <div className="flex-1 p-4 overflow-y-auto">
//         {messages.map((msg, index) => (
//           <div key={index} className={`my-2 ${msg.author === 'user' ? 'text-right' : 'text-left'}`}>
//             <div className={`inline-block p-2 rounded-lg ${msg.author === 'user' ? 'bg-green-600' : 'bg-gray-700'}`}>
//               {msg.text}
//             </div>
//           </div>
//         ))}
//         {isLoading && <div className="text-left"><div className="inline-block p-2 rounded-lg bg-gray-700">...</div></div>}
//       </div>

//       <form onSubmit={sendMessage} className="flex p-3 border-t border-gray-700">
//         <input 
//           type="text" 
//           value={input} 
//           onChange={(e) => setInput(e.target.value)}
//           placeholder="Ask a question..."
//           className="flex-1 px-3 py-2 bg-gray-700 rounded-l-md focus:outline-none"
//         />
//         <button type="submit" className="bg-green-600 hover:bg-green-700 px-4 rounded-r-md">Send</button>
//       </form>
//     </div>
//   );
// }

// export default Chatbot;
// src/Chatbot.js

import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Box, Typography, Button, Paper, TextField } from '@mui/material';


// --- ONLINE AI SETUP ---
// This part is for the powerful online AI.
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
let model;
if (API_KEY) {
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    } catch (error) {
        console.error("Failed to initialize GoogleGenerativeAI:", error);
    }
}


// --- OFFLINE KNOWLEDGE BASE ---
// This is the backup for when the user has no internet.
const FAQ_KNOWLEDGE_BASE = [
    {
        question: "What is the powerhouse of the cell?",
        keywords: ["powerhouse", "cell", "mitochondrion"],
        answer: "The mitochondrion is known as the 'powerhouse' of the cell because it generates most of the cell's supply of ATP, used as a source of chemical energy."
    },
    {
        question: "What is photosynthesis?",
        keywords: ["photosynthesis", "plants", "sunlight", "food"],
        answer: "Photosynthesis is the process plants use to convert light energy into chemical energy (food) by using sunlight, water, and carbon dioxide. It also produces oxygen!"
    },
    {
        question: "How many planets are in the solar system?",
        keywords: ["planets", "solar", "system", "how many"],
        answer: "There are eight planets in our Solar System: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune."
    },
    {
        question: "What is gravity?",
        keywords: ["gravity", "force", "down"],
        answer: "Gravity is the force by which a planet or other body draws objects toward its center. It's what keeps you on the ground and what keeps the planets in orbit around the Sun."
    }
];

const findOfflineAnswer = (studentQuestion) => {
    const question = studentQuestion.toLowerCase();
    let bestMatch = { score: 0, answer: "I'm sorry, I can't answer that right now. Please check your internet connection or ask your teacher." };
    for (const faq of FAQ_KNOWLEDGE_BASE) {
        let currentScore = 0;
        for (const keyword of faq.keywords) {
            if (question.includes(keyword)) {
                currentScore++;
            }
        }
        if (currentScore > bestMatch.score) {
            bestMatch = { score: currentScore, answer: faq.answer };
        }
    }
    return bestMatch.answer;
};


function Chatbot({ closeChat }) {
    const [messages, setMessages] = useState([
        { author: 'ai', text: 'Hello! Ask me a question about your subjects.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { author: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        let aiResponse = '';

        // --- HYBRID LOGIC ---
        // Check if the user is online AND the AI model is available.
        if (navigator.onLine && model) {
            try {
                // We are ONLINE: Try to use the powerful AI.
                const result = await model.generateContent(currentInput);
                const response = await result.response;
                aiResponse = response.text();
            } catch (error) {
                console.error("Online AI failed, falling back to offline mode.", error);
                // If the online AI fails for any reason, use the offline backup.
                aiResponse = findOfflineAnswer(currentInput);
            }
        } else {
            // We are OFFLINE: Use the simple FAQ knowledge base.
            aiResponse = findOfflineAnswer(currentInput);
        }
        
        const aiMessage = { author: 'ai', text: aiResponse };
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
    };

    return (
        <Box sx={{
            position: 'fixed', bottom: '88px', right: '16px', width: '350px', height: '500px',
            bgcolor: 'background.paper', border: '1px solid grey', borderRadius: 2,
            boxShadow: 6, display: 'flex', flexDirection: 'column', zIndex: 1200
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderBottom: '1px solid grey' }}>
                <Typography variant="h6" color="primary">Assistant</Typography>
                {/* Online/Offline Indicator */}
                <Box sx={{ height: '10px', width: '10px', borderRadius: '50%', bgcolor: navigator.onLine ? 'success.main' : 'error.main' }} />
                <Button onClick={closeChat} sx={{ minWidth: 'auto', p: 0.5 }}>&times;</Button>
            </Box>
            
            <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
                {messages.map((msg, index) => (
                    <Box key={index} sx={{ mb: 1.5, textAlign: msg.author === 'user' ? 'right' : 'left' }}>
                        <Paper elevation={2} sx={{
                            display: 'inline-block', p: 1, borderRadius: 2,
                            bgcolor: msg.author === 'user' ? 'primary.main' : 'action.hover',
                            color: msg.author === 'user' ? 'primary.contrastText' : 'text.primary',
                        }}>
                            {msg.text}
                        </Paper>
                    </Box>
                ))}
                {isLoading && <Typography sx={{ textAlign: 'left', color: 'text.secondary' }}>...</Typography>}
            </Box>

            <Box component="form" onSubmit={sendMessage} sx={{ display: 'flex', p: 1, borderTop: '1px solid grey' }}>
                <TextField fullWidth size="small" variant="outlined" type="text" value={input}
                    onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..."
                />
                <Button type="submit" variant="contained" sx={{ ml: 1 }}>Send</Button>
            </Box>
        </Box>
    );
}

export default Chatbot;