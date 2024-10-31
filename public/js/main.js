// Import the Socket.IO library
import { io } from 'https://cdn.socket.io/4.8.0/socket.io.esm.min.js';

// Connect to the WebSocket server
const socket = io('http://localhost:3001/chat-gateway'); // WebSocket server URL

// Extract URL parameters to get the username and room
const urlParams = new URLSearchParams(window.location.search);
const username =
  urlParams.get('username') || `Anonymous#${Math.floor(Math.random() * 1000)}`;
const room = urlParams.get('room') || 'general'; // Default room

// Wait for the document to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Handle the window unload event to notify the server of user leaving
  window.onbeforeunload = () => {
    alert('Bye!');
    socket.emit('leaveRoom', username);
    socket.disconnect();
    socket.close();
  };

  // Get references to HTML elements
  const messageInput = document.getElementById('message');
  const messageForm = document.getElementById('messageForm');
  const messages = document.getElementById('messages');
  let replyingTo = null;

  // Notify the server that the user has joined
  socket.emit('joinRoom', { username, room });

  // Listen for incoming messages from the server
  socket.on('message', (data) => {
    // Create a new list item for each message
    const messageItem = document.createElement('li');

    // Create a span for the username
    const usernameSpan = document.createElement('span');
    usernameSpan.textContent = `${data.username}: `;
    usernameSpan.classList.add('username');

    // Create a span for the message
    const messageSpan = document.createElement('span');
    messageSpan.textContent = data.message;
    messageSpan.classList.add('message');

    // Append username and message to the message item
    messageItem.appendChild(usernameSpan);
    messageItem.appendChild(messageSpan);

    // If replying to a message, show the original message
    console.log(data, 'Data');
    if (data.replyTo) {
      const replyToItem = document.createElement('blockquote');
      replyToItem.textContent = `Replying to: ${data.replyTo}`;
      messageItem.prepend(replyToItem);
    }

    // Check if the message is from the current user
    if (data.username === username) {
      messageItem.classList.add('self'); // Add class for self messages
    } else {
      messageItem.classList.add('other'); // Add class for other messages
    }

    // Add a click listener to reply to the message
    messageItem.addEventListener('click', () => {
      replyingTo = data.message; // Set the message to reply to
      messageInput.value = `@${data.username} `; // Pre-fill the input
      console.log(replyingTo, 'Replying to');
      messageInput.focus();
    });

    // Append the message item to the messages list
    messages.appendChild(messageItem);
  });

  // Handle form submission to send a new message
  messageForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent default form submission
    const message = messageInput.value;

    // Emit the message with reply information if applicable
    socket.emit('message', {
      username,
      room,
      message,
      replyTo: replyingTo ? replyingTo : undefined,
    });

    // Clear the input after sending and reset reply state
    messageInput.value = '';
    replyingTo = null;
  });
});
