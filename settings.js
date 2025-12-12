'use strict';

// Relies on utils.js being loaded

let pendingProfilePicBase64 = null;

document.addEventListener('DOMContentLoaded', () => {
    // Cache selectors
    const saveButton = document.getElementById('profile-save-changes-button');
    const fileInput = document.getElementById('profile-upload-input');
    const removeButton = document.getElementById('remove-profile-button');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (event) {
                    updatePreviewImage(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removeButton) {
        removeButton.addEventListener('click', () => {
            updatePreviewImage("");
        });
    }

    if (saveButton) {
        saveButton.addEventListener('click', saveProfileChanges);
    }
});

function updatePreviewImage(base64String) {
    pendingProfilePicBase64 = base64String;

    // Only update the big profile image on this page immediately for preview
    const bigProfileImg = document.querySelector('#profile-image-container img');
    if (bigProfileImg) {
        if (base64String === "") {
            bigProfileImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        } else {
            bigProfileImg.src = base64String;
        }
    }
}


function saveProfileChanges() {
    const currentUser = getSessionUser();
    if (!currentUser) {
        alert("Session expired. Please log in again.");
        window.location.href = 'login.html';
        return;
    }

    const usernameInput = document.getElementById('edit-username-input');
    let inputUsername = usernameInput.value.trim();

    // If empty, keep existing
    if (!inputUsername) {
        inputUsername = currentUser.username;
    }

    const profiles = getStorage(STORAGE_KEYS.PROFILES, {});

    // Unique check
    const isTaken = Object.values(profiles).some(user =>
        user.username === inputUsername && user.stu_id !== currentUser.stu_id
    );

    if (isTaken) {
        alert("Username is already taken.");
        return;
    }

    // Find user key
    const profileKey = Object.keys(profiles).find(key => profiles[key].stu_id === currentUser.stu_id);

    if (profileKey) {
        // Update local object
        profiles[profileKey].username = inputUsername;
        if (pendingProfilePicBase64 !== null) {
            profiles[profileKey].profile_pic = pendingProfilePicBase64;
        }

        // Save to DB
        setStorage(STORAGE_KEYS.PROFILES, profiles);

        // Update Session
        const updatedUser = profiles[profileKey];
        setSessionUser(updatedUser);

        alert("Profile updated successfully!");

        // Refresh UI
        if (typeof updateUserInfo === 'function') {
            updateUserInfo();
        }

        // Reset pending state
        pendingProfilePicBase64 = null;

    } else {
        alert("Error: User profile not found.");
    }
}
