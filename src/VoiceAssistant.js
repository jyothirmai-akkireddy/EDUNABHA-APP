// src/VoiceAssistant.js

import React from 'react';

function VoiceAssistant({ isListening, startListening }) {
  let statusText = "Not started";
  if (isListening) {
    statusText = "Listening...";
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 p-4 rounded-lg shadow-lg flex items-center space-x-4">
      <p className="text-gray-300">
        Voice Assistant: <span className="font-bold text-green-400">{statusText}</span>
      </p>
      <button 
        onClick={startListening} 
        disabled={isListening}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-500"
      >
        Start Voice Assistant
      </button>
    </div>
  );
}

export default VoiceAssistant;