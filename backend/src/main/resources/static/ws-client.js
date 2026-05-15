// ws-client.js
let stompClient = null;

function connectWebSocket() {
    // Determine context based on current page
    const isAdminPage = window.location.pathname.includes('admin');

    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // Disable debug logging for production

    stompClient.connect({}, function (frame) {

        if (isAdminPage) {
            // Admin context
            stompClient.subscribe('/topic/admin', function (message) {
                const event = JSON.parse(message.body);

                // If there's a global toast function (either from admin layout or elsewhere)
                if (typeof showToast === 'function') {
                    showToast('Application Update: ' + (event.data?.studentId || event.event));
                }

                // Dispatch event after a short delay to ensure backend DB transaction has committed
                setTimeout(() => {
                    document.dispatchEvent(new CustomEvent('adminDataUpdated', { detail: event }));
                }, 400);
            });
        } else {
            // Student context
            const sessionUserRaw = sessionStorage.getItem('iUEP_current_user');
            if (sessionUserRaw) {
                try {
                    const sessionUser = JSON.parse(sessionUserRaw);
                    const stuId = sessionUser.stu_id;
                    if (stuId) {
                        stompClient.subscribe('/topic/status/' + stuId, function (message) {
                            const event = JSON.parse(message.body);

                            // Dispatch event after a short delay to ensure backend DB transaction has committed
                            setTimeout(() => {
                                document.dispatchEvent(new CustomEvent('idStatusUpdated', { detail: event }));
                            }, 400);
                        });
                    }
                } catch (e) {
                    console.error('Failed to parse session user', e);
                }
            }
        }
    }, function (error) {
        console.error('WebSocket connection error:', error);
        // Try to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
    });
}

// Start connection if SockJS and Stomp are loaded
if (typeof SockJS !== 'undefined' && typeof Stomp !== 'undefined') {
    connectWebSocket();
} else {
    console.warn('SockJS or Stomp not loaded, skipping WebSocket connection.');
}
