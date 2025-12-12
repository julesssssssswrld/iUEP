'use strict';

// Relies on utils.js

document.addEventListener('DOMContentLoaded', () => {
    loadPosts();
    initEventListeners();
    loadComments();
    loadReactionsUI();

    const postBtn = document.getElementById('discussion-post-button');
    if (postBtn) {
        postBtn.addEventListener('click', createPost);
    }
});

function initEventListeners() {
    const contentArea = document.getElementById('discussion-content');
    if (!contentArea) return;

    contentArea.addEventListener('click', function (e) {
        const target = e.target;

        const commentTrigger = target.closest('.comment-trigger');
        if (commentTrigger) {
            e.preventDefault();
            const postBox = commentTrigger.closest('.content-box-discussions');
            const commentSection = postBox.querySelector('.comments-section');

            const isHidden = getComputedStyle(commentSection).display === 'none';
            commentSection.style.display = isHidden ? 'flex' : 'none';
            return;
        }

        const reactionBtn = target.closest('.like-reaction-container, .dislike-reaction-container');
        if (reactionBtn) {
            const type = reactionBtn.classList.contains('like-reaction-container') ? 'like' : 'dislike';
            handleReaction(type, reactionBtn);
        }
    });
}

function createPost() {
    const titleInput = document.getElementById('discussion-post-title');
    const contentInput = document.getElementById('discussion-post-content');
    const anonymousCheckbox = document.getElementById('anonymous');

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title || !content) {
        alert("Please enter both a title and content.");
        return;
    }

    const currentUser = getSessionUser();
    if (!currentUser) {
        alert("You must be logged in to post.");
        return;
    }

    const isAnonymous = anonymousCheckbox ? anonymousCheckbox.checked : false;
    const displayName = isAnonymous ? "Anonymous User" : currentUser.username;
    const displayImgSrc = isAnonymous ? "Figma/ellipse_1_2.png" : "";

    const newPostId = Date.now().toString();

    const postData = {
        id: newPostId,
        studentId: currentUser.stu_id,
        displayName: displayName,
        displayImgSrc: displayImgSrc,
        title: title,
        content: content,
        timestamp: typeof formatDate === 'function' ? formatDate() : new Date().toLocaleDateString(),
        createdAt: Date.now(),
        isAnonymous: isAnonymous
    };

    const allPosts = getStorage(STORAGE_KEYS.POSTS, []);
    allPosts.push(postData);
    setStorage(STORAGE_KEYS.POSTS, allPosts);

    renderPost(postData, true);

    titleInput.value = '';
    contentInput.value = '';
}

function loadPosts() {
    const allPosts = getStorage(STORAGE_KEYS.POSTS, []);
    allPosts.forEach(post => renderPost(post, false));
}

function renderPost(post, isNew) {
    const contentArea = document.getElementById('discussion-content');
    const profileImg = getDisplayImage(post);

    const postHtml = `
            <div class="content-box content-box-discussions" data-post-id="${post.id}">
                <div class="discussions-post-user-info">
                    <div class="discussions-post-user-info-profile-container">
                        ${profileImg ? `<img src="${profileImg}" alt="">` : ''}
                    </div>
                    <div class="user-info-and-posted">
                        <h3>${post.displayName}</h3>
                        <p class="sub-text">${post.createdAt ? formatRelativeTime(post.createdAt) : post.timestamp}</p>
                    </div>
                </div>

                <div class="discussions-article">
                    <h2>${post.title}</h2>
                    <p class="main-text">${post.content}</p>
                </div>

                <div class="interact-container">
                    <div class="reaction-container">
                        <div class="like-reaction-container">
                            <svg class="discussion-reaction-icons" xmlns="http://www.w3.org/2000/svg" height="24px"
                                viewBox="0 -960 960 960" width="24px" fill="#000000">
                                <path
                                    d="M720-120H280v-520l280-280 50 50q7 7 11.5 19t4.5 23v14l-44 174h258q32 0 56 24t24 56v80q0 7-2 15t-4 15L794-168q-9 20-30 34t-44 14Zm-360-80h360l120-280v-80H480l54-220-174 174v406Zm0-406v406-406Zm-80-34v80H160v360h120v80H80v-520h200Z" />
                            </svg>
                             <span class="reaction-count" data-type="like">0</span>
                        </div>
                        <div class="divider"></div>
                        <div class="dislike-reaction-container">
                            <svg class="discussion-reaction-icons" xmlns="http://www.w3.org/2000/svg" height="24px"
                                viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
                                <path
                                    d="M240-840h440v520L400-40l-50-50q-7-7-11.5-19t-4.5-23v-14l44-174H120q-32 0-56-24t-24-56v-80q0-7 2-15t4-15l120-282q9-20 30-34t44-14Zm360 80H240L120-480v80h360l-54 220 174-174v-406Zm0 406v-406 406Zm80 34v-80h120v-360H680v-80h200v520H680Z" />
                            </svg>
                             <span class="reaction-count" data-type="dislike">0</span>
                        </div>
                    </div>
                    <div class="reaction-container">
                        <div class="comment-trigger">
                            <div class="comment-reaction-container">
                                <svg class="discussion-reaction-icons" xmlns="http://www.w3.org/2000/svg" height="24px"
                                    viewBox="0 -960 960 960" width="24px" fill="#000000">
                                    <path
                                        d="M240-400h480v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM880-80 720-240H160q-33 0-56.5-23.5T80-320v-480q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v720ZM160-320h594l46 45v-525H160v480Zm0 0v-480 480Z" />
                                </svg>
                                <span class="reaction-count" data-type="comment">0</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="comments-section" style="display: none;">
                    <div class="comments-list"></div>
                    <div class="comment-input-wrapper">
                        <input type="text" class="comment-input" placeholder="Write a comment...">
                        <div class="comment-send-btn" onclick="postComment(this)">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                                fill="#17376E">
                                <path
                                    d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
    `;

    contentArea.insertAdjacentHTML('afterbegin', postHtml);
}

function handleReaction(actionType, element) {
    const currentUser = getSessionUser();
    if (!currentUser) {
        alert("You must be logged in to react.");
        return;
    }
    const username = currentUser.username;

    const postBox = element.closest('.content-box-discussions');
    const postId = postBox.dataset.postId;

    const allReactions = getStorage(STORAGE_KEYS.REACTIONS, {});
    if (!allReactions[postId]) {
        allReactions[postId] = { like: 0, dislike: 0 };
    }

    const userActivity = getStorage(STORAGE_KEYS.ACTIVITY, {});
    if (!userActivity[username]) {
        userActivity[username] = {};
    }

    const currentStatus = userActivity[username][postId];

    if (currentStatus === actionType) {
        allReactions[postId][actionType] = Math.max(0, allReactions[postId][actionType] - 1);
        delete userActivity[username][postId];
    } else {
        if (currentStatus) {
            allReactions[postId][currentStatus] = Math.max(0, allReactions[postId][currentStatus] - 1);
        }
        allReactions[postId][actionType]++;
        userActivity[username][postId] = actionType;
    }

    setStorage(STORAGE_KEYS.REACTIONS, allReactions);
    setStorage(STORAGE_KEYS.ACTIVITY, userActivity);

    updatePostReactionUI(postBox, allReactions[postId], userActivity[username][postId]);
}

function updatePostReactionUI(postBox, counts, userStatus) {
    const likeBtn = postBox.querySelector('.like-reaction-container');
    const dislikeBtn = postBox.querySelector('.dislike-reaction-container');

    if (likeBtn) likeBtn.querySelector('.reaction-count').textContent = counts.like;
    if (dislikeBtn) dislikeBtn.querySelector('.reaction-count').textContent = counts.dislike;

    likeBtn.classList.remove('active-reaction');
    dislikeBtn.classList.remove('active-reaction');

    if (userStatus === 'like') {
        likeBtn.classList.add('active-reaction');
    } else if (userStatus === 'dislike') {
        dislikeBtn.classList.add('active-reaction');
    }
}

function loadReactionsUI() {
    const allReactions = getStorage(STORAGE_KEYS.REACTIONS, {});
    const currentUser = getSessionUser();

    let currentUserActivity = {};
    if (currentUser) {
        const allUserActivity = getStorage(STORAGE_KEYS.ACTIVITY, {});
        currentUserActivity = allUserActivity[currentUser.username] || {};
    }

    document.querySelectorAll('.content-box-discussions').forEach(postBox => {
        const postId = postBox.dataset.postId;
        const counts = allReactions[postId] || { like: 0, dislike: 0 };
        const userStatus = currentUserActivity[postId];

        updatePostReactionUI(postBox, counts, userStatus);
    });
}

function loadComments() {
    const allComments = getStorage(STORAGE_KEYS.COMMENTS, {});

    Object.entries(allComments).forEach(([postId, comments]) => {
        const postBox = document.querySelector(`.content-box-discussions[data-post-id="${postId}"]`);
        if (postBox) {
            const commentsList = postBox.querySelector('.comments-list');
            const commentsHtml = comments.map(createCommentHtml).join('');
            commentsList.insertAdjacentHTML('beforeend', commentsHtml);

            const commentCountSpan = postBox.querySelector('.reaction-count[data-type="comment"]');
            if (commentCountSpan) {
                commentCountSpan.textContent = comments.length;
            }
        }
    });
}

function createCommentHtml(comment) {
    const imgSrc = getDisplayImage(comment);
    const imgHtml = imgSrc ? `<img src="${imgSrc}" alt="">` : '';
    return `
        <div class="comment-item">
            <div class="comment-avatar">
                ${imgHtml}
            </div>
            <div class="comment-content">
                <span class="comment-author">${comment.displayName}</span>
                <span class="comment-text">${comment.text}</span>
            </div>
        </div>
    `;
}

window.postComment = function (btnElement) {
    const inputWrapper = btnElement.parentElement;
    const inputField = inputWrapper.querySelector('.comment-input');
    const commentText = inputField.value.trim();

    if (!commentText) return;

    const currentUser = getSessionUser();
    if (!currentUser) {
        alert("You must be logged in to comment.");
        return;
    }

    const anonymityCheckbox = document.getElementById('anonymous');
    const isAnonymous = anonymityCheckbox ? anonymityCheckbox.checked : false;

    const displayName = isAnonymous ? "Anonymous User" : currentUser.username;
    const displayImgSrc = isAnonymous ? "Figma/ellipse_1_2.png" : "";

    const commentData = {
        studentId: currentUser.stu_id,
        displayName: displayName,
        displayImgSrc: displayImgSrc,
        text: commentText,
        timestamp: typeof formatDate === 'function' ? formatDate() : new Date().toLocaleDateString()
    };

    const commentSection = inputWrapper.parentElement;
    const commentsList = commentSection.querySelector('.comments-list');

    commentsList.insertAdjacentHTML('beforeend', createCommentHtml(commentData));

    const postBox = btnElement.closest('.content-box-discussions');
    const postId = postBox.dataset.postId;

    if (postId) {
        const allComments = getStorage(STORAGE_KEYS.COMMENTS, {});
        if (!allComments[postId]) {
            allComments[postId] = [];
        }
        allComments[postId].push(commentData);
        setStorage(STORAGE_KEYS.COMMENTS, allComments);
    }

    const commentCountSpan = postBox.querySelector('.reaction-count[data-type="comment"]');
    if (commentCountSpan) {
        let currentCount = parseInt(commentCountSpan.textContent) || 0;
        commentCountSpan.textContent = currentCount + 1;
    }

    inputField.value = '';
};
