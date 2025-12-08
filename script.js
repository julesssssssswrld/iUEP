document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. User Preview Modal Logic ---
    const userPreview = document.getElementById('user-preview');
    const userModal = document.getElementById('user-modal');

    if (userPreview && userModal) {
        userPreview.addEventListener('click', (e) => {
            e.stopPropagation();
            userModal.classList.toggle('show');
            const arrow = document.getElementById('user-preview-options');
            if(arrow) arrow.style.transform = userModal.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)';
        });

        document.addEventListener('click', (e) => {
            if (!userPreview.contains(e.target) && !userModal.contains(e.target)) {
                userModal.classList.remove('show');
                const arrow = document.getElementById('user-preview-options');
                if(arrow) arrow.style.transform = 'rotate(0deg)';
            }
        });
    }

    // --- 2. Global Discussion Logic (Posting & Commenting) ---
    const feedContainer = document.getElementById('discussion-content');
    const postBtn = document.getElementById('discussion-post-button');

    // A. Logic for Creating a New Post
    if (postBtn && feedContainer) {
        postBtn.addEventListener('click', () => {
            const titleInput = document.getElementById('discussion-post-title');
            const contentInput = document.getElementById('discussion-post-content');
            const isAnonymous = document.getElementById('anonymous');

            if (titleInput.value.trim() === "" || contentInput.value.trim() === "") {
                alert("Please enter both a title and content.");
                return;
            }

            const userName = isAnonymous && isAnonymous.checked ? "Anonymous User" : "Current User"; 
            const userImg = "Figma/info_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"; 

            // Create HTML Structure (Includes hidden Comment Section)
            const newPostHTML = `
            <div class="content-box content-box-discussions fade-in">
                <div class="discussions-post-user-info">
                    <div class="discussions-post-user-info-profile-container">
                        <img src="${userImg}" alt="Profile">
                    </div>
                    <div class="user-info-and-posted">
                        <h3>${userName}</h3>
                        <p class="sub-text">Just now</p>
                    </div>
                </div>

                <div class="discussions-article">
                    <h2>${titleInput.value}</h2>
                    <p class="main-text">${contentInput.value}</p>
                </div>

                <div class="interact-container">
                    <div class="reaction-container">
                        <div class="like-reaction-container">
                            <svg class="discussion-reaction-icons" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M720-120H280v-520l280-280 50 50q7 7 11.5 19t4.5 23v14l-44 174h258q32 0 56 24t24 56v80q0 7-2 15t-4 15L794-168q-9 20-30 34t-44 14Zm-360-80h360l120-280v-80H480l54-220-174 174v406Zm0-406v406-406Zm-80-34v80H160v360h120v80H80v-520h200Z"/></svg>
                        </div>
                        <div class="divider"></div>
                        <div class="dislike-reaction-container">
                            <svg class="discussion-reaction-icons" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M240-840h440v520L400-40l-50-50q-7-7-11.5-19t-4.5-23v-14l44-174H120q-32 0-56-24t-24-56v-80q0-7 2-15t4-15l120-282q9-20 30-34t44-14Zm360 80H240L120-480v80h360l-54 220 174-174v-406Zm0 406v-406 406Zm80 34v-80h120v-360H680v-80h200v520H680Z"/></svg>
                        </div>
                    </div>
                    <div class="reaction-container">
                        <a href="javascript:void(0)" class="comment-toggle-btn">
                            <div class="comment-reaction-container-inner">
                                <svg class="discussion-reaction-icons" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M240-400h480v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM880-80 720-240H160q-33 0-56.5-23.5T80-320v-480q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v720ZM160-320h594l46 45v-525H160v480Zm0 0v-480 480Z"/></svg>
                            </div>
                        </a>
                    </div>
                </div>

                <div class="comment-section">
                    <div class="comment-list">
                        </div>
                    <div class="comment-input-area">
                        <input type="text" class="comment-input" placeholder="Write a comment...">
                        <button class="comment-submit-btn">Send</button>
                    </div>
                </div>
            </div>
            `;

            feedContainer.insertAdjacentHTML('afterbegin', newPostHTML);
            titleInput.value = "";
            contentInput.value = "";
        });
    }

    // B. Logic for Commenting (Event Delegation)
    if (feedContainer) {
        feedContainer.addEventListener('click', (e) => {
            // 1. Handle Toggle Comment Section
            // We look for the closest element with class 'comment-toggle-btn'
            const toggleBtn = e.target.closest('.comment-toggle-btn');
            if (toggleBtn) {
                e.preventDefault(); // Stop page jump
                // Find the parent post box
                const postBox = toggleBtn.closest('.content-box-discussions');
                // Find the specific comment section inside this post
                const commentSection = postBox.querySelector('.comment-section');
                // Toggle visibility
                commentSection.classList.toggle('show');
            }

            // 2. Handle Submit Comment
            if (e.target.classList.contains('comment-submit-btn')) {
                const postBox = e.target.closest('.content-box-discussions');
                const inputField = postBox.querySelector('.comment-input');
                const commentList = postBox.querySelector('.comment-list');
                
                const text = inputField.value.trim();

                if (text !== "") {
                    const newComment = document.createElement('div');
                    newComment.classList.add('single-comment');
                    // Simple HTML for a comment
                    newComment.innerHTML = `
                        <div class="comment-author">You</div>
                        <div>${text}</div>
                    `;
                    
                    commentList.appendChild(newComment);
                    inputField.value = ""; // Clear input
                }
            }
        });
    }
});