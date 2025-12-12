'use strict';

// Relies on utils.js being loaded first in HTML

function initDatabase() {
    if (!localStorage.getItem(STORAGE_KEYS.PROFILES)) {
        // Safe check for global INITIAL_PROFILES
        const initialData = (typeof INITIAL_PROFILES !== 'undefined') ? INITIAL_PROFILES : {};
        setStorage(STORAGE_KEYS.PROFILES, initialData);
    }
}

initDatabase();

function parseFullName(fullNameString) {
    if (!fullNameString) return { first_name: "", middle_name: "", last_name: "" };

    const parts = fullNameString.split(',').map(s => s.trim());
    return {
        first_name: parts[0] || "",
        middle_name: parts[1] || "",
        last_name: parts[2] || ""
    };
}

function handleLogin(event) {
    event.preventDefault();

    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();
    const rememberMe = document.getElementById('remember-me').checked;

    if (!usernameInput || !passwordInput) {
        alert("Please enter both username and password.");
        return;
    }

    const profiles = getStorage(STORAGE_KEYS.PROFILES, {});

    // Optimize search: iterate over values directly
    const userFound = Object.values(profiles).find(user =>
        (user.username === usernameInput || user.stu_id === usernameInput) && user.password === passwordInput
    );

    if (userFound) {
        setSessionUser(userFound);

        if (rememberMe) {
            localStorage.setItem('iUEP_remembered_user', JSON.stringify({
                username: usernameInput,
                password: passwordInput
            }));
        } else {
            localStorage.removeItem('iUEP_remembered_user');
        }

        alert(`Login Successful! Welcome, ${userFound.first_name}.`);
        window.location.href = (userFound.role === 'student') ? 'index.html' : 'admin.html';
    } else {
        alert("Invalid credentials. Please check your Username/ID and Password.");
    }
}

function handleSignup(event) {
    event.preventDefault();

    const rawName = document.getElementById('name').value;
    const username = document.getElementById('username').value.trim();
    const stu_id = document.getElementById('stu_id').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!rawName.includes(',')) {
        alert("Please format the name as: First Name, Middle Name, Last Name");
        return;
    }

    const profiles = getStorage(STORAGE_KEYS.PROFILES, {});

    // Optimize existence check
    const userExists = Object.values(profiles).some(user =>
        user.username === username || user.stu_id === stu_id
    );

    if (userExists) {
        const isUsernameTaken = Object.values(profiles).some(u => u.username === username);
        if (isUsernameTaken) {
            alert("Username already taken.");
            return;
        }
        alert("Student ID already registered.");
        return;
    }

    const nameData = parseFullName(rawName);

    // Generate simplified key
    const newKey = Date.now().toString();

    const newUser = {
        last_name: nameData.last_name,
        first_name: nameData.first_name,
        middle_name: nameData.middle_name,
        username: username,
        stu_id: stu_id,
        password: password,
        role: "student",
        college: ""
    };

    profiles[newKey] = newUser;
    setStorage(STORAGE_KEYS.PROFILES, profiles);

    alert("Account created successfully! Redirecting to login...");
    window.location.href = 'login.html';
}

function checkRememberedUser() {
    const rememberedUser = localStorage.getItem('iUEP_remembered_user');
    if (rememberedUser) {
        const { username, password } = JSON.parse(rememberedUser);
        if (document.getElementById('username')) {
            document.getElementById('username').value = username;
            document.getElementById('password').value = password;
            document.getElementById('remember-me').checked = true;
        }
    }
}

// Run on load if we are on the login page
if (document.getElementById('login-form')) {
    checkRememberedUser();
}