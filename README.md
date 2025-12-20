iUEP - University Electronic Portal
iUEP is a web-based student portal designed for the University of Eastern Philippines. It aims to solve accessibility issues by digitizing essential academic services—moving them from physical bulletin boards to a responsive, cloud-native platform.

This project consolidates class schedules, grade monitoring, and event calendars into one interface, while serving as a central hub for campus communication and student expression.

🚀 Key Features
centralized Dashboard: Aggregates the latest headlines from the University Student Council (USC) and departmental updates (CNAHS, COE, CVM, CS) to keep students informed.

Academic Tools:

Grades Portal: View subject codes, descriptions, and grades in a clean table format.

Schedule: Integrated class schedule viewer (embedded Google Calendar support).

Discussion (Freedom Wall): An open forum for students to post thoughts and comments. Includes an Anonymous Mode to encourage honest expression.

User Customization:

Dark Mode: Built-in theme toggler that persists user preference.

Profile Management: Users can update their username and profile picture.

Authentication System: Complete Login and Signup flow with session management and "Remember Me" functionality.

🛠️ Tech Stack
This project is built using Vanilla Web Technologies with a simulated backend:

Frontend: HTML5, CSS3 (Custom properties for theming), JavaScript (ES6+).

Data Persistence: localStorage and sessionStorage are used to simulate a database for users, posts, comments, and sessions (No external backend required).

Design: Responsive Mobile-First design using Flexbox and CSS Grid.

📂 Project Structure
index.html - The main dashboard displaying announcements.

grades.html / schedule.html - Academic utility pages.

discussion.html - The social feed/freedom wall.

auth.js / users-db.js - Handles user authentication and mock database seeding.

style.css - Global styling and Dark/Light theme definitions.

👥 Authors
Jules Ian C. Tomacas

Jovan P. Atencio
