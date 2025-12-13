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



function handleLogin(event) {
    event.preventDefault();

    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();
    const rememberMe = document.getElementById('remember-me').checked;

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

        window.location.href = (userFound.role === 'student') ? 'index.html' : 'admin.html';
    } else {
        document.getElementById('login-error-popover').showPopover();
    }
}

function handleSignup(event) {
    event.preventDefault();

    const firstName = document.getElementById('first_name').value.trim();
    const middleName = document.getElementById('middle_name').value.trim();
    const lastName = document.getElementById('last_name').value.trim();
    const username = document.getElementById('username').value.trim();
    const stu_id = document.getElementById('stu_id').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!firstName || !lastName || !username || !stu_id || !password) {
        alert("Please fill in all required fields.");
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

    // Generate simplified key
    const newKey = Date.now().toString();

    const newUser = {
        last_name: lastName,
        first_name: firstName,
        middle_name: middleName,
        username: username,
        stu_id: stu_id,
        password: password,
        role: "student",
        college: ""
    };

    profiles[newKey] = newUser;
    setStorage(STORAGE_KEYS.PROFILES, profiles);

    // Show custom popover instead of alert
    const popover = document.getElementById('account-created-popup');
    if (popover) {
        popover.showPopover();
    } else {
        // Fallback if popover missing (shouldn't happen)
        alert("Account created successfully! Redirecting to login...");
        window.location.href = 'login.html';
    }
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleButton = document.getElementById('toggle-password');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        // Change icon to "visibility off" (slash eye)
        toggleButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L625-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z"/></svg>';
    } else {
        passwordInput.type = 'password';
        // Change icon back to "visibility" (open eye)
        toggleButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q62-139 182-220.5T480-802q146 0 266 81.5T920-500q-62 139-182 220.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-200Z"/></svg>';
    }
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

// Event listener for Account Created popup confirm button
const accountCreatedConfirmBtn = document.getElementById('account-created-confirm-btn');
if (accountCreatedConfirmBtn) {
    accountCreatedConfirmBtn.addEventListener('click', () => {
        window.location.href = 'login.html';
    });
}