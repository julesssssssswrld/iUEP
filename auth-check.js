(function () {
    'use strict';

    const userSession = sessionStorage.getItem('iUEP_current_user');

    if (!userSession) {
        console.warn("Access Denied: No user logged in.");
        window.location.href = 'login.html';
    }
})();